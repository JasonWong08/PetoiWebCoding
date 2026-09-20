# Quick Connect 修复总结（2026-09-20）

## 1. 背景

本次修改针对 `main.html` 中 Quick Connect 通过 Web Serial 获取机器人 WiFi IP 地址的流程进行了修复和兼容性改进。

涉及的调试日志：

- `D:\Petoi\web_coding_block\log_2026-09-20T07-10-09.md`
- `D:\Petoi\web_coding_block\log_2026-09-20T07-46-00.md`
- `D:\Petoi\web_coding_block\log_2026-09-20T08-39-00.md`

主要修改文件：

- `main.html`
- `lang/translations.js`

## 2. 问题一：串口刚打开时 Quick Connect 误弹出 WiFi 配置框

### 现象

机器人已经连接 WiFi 并拥有有效 IP，但点击 Quick Connect 后仍弹出 SSID 和密码输入框。关闭对话框后，在串口监视器中手工发送 `w` 却可以正常取得 IP。

### 根因

串口打开后，原流程异步发送 `?` 进行机型验证，但不等待验证完成就立即发送 `w\n`。两个命令在几毫秒内连续写入，设备可能尚未就绪或尚未处理完前一条命令，导致 `w` 响应丢失。

原实现只固定等待 3 秒，并通过检查 `currentDeviceIP` 是否变化判断是否成功。超时后即强制显示 WiFi 配置框。

### 修复

1. 打开串口并先启动 `readSerialData()` 读取循环。
2. 等待 `validateSerialConnection()` 验证流程完全结束。
3. 验证结束后才允许发送 `w\n`。
4. 新增 `waitForDetectedIP()`，等待串口解析器明确识别到 IP，不再仅检查旧的全局变量。
5. `w` 指令最多发送 3 次，每次等待 4 秒，重试间隔为 300 ms。
6. 只有三次都没有收到有效 IP 时才显示 WiFi 配置框。
7. 收到 `192.168.4.1` 时仍视为默认 AP 模式，提示用户配置 WiFi。

## 3. 问题二：内部 IP 与页面 UI 可能不同步

### 现象和风险

IP 状态分别保存在三个互不自动绑定的位置：

- JavaScript 变量 `currentDeviceIP`
- Quick Connect 按钮的文本和 `data-connected` 属性
- Blockly `make_connection` 积木的 `IP_ADDRESS` 字段

原来只在 `currentDeviceIP !== ip` 时同步按钮和积木。如果用户在连接成功后手工修改了积木中的 IP，机器人再次返回相同 IP 时，旧逻辑不会修正积木的错误显示。

### 修复

- `currentDeviceIP` 发生变化时才更新内部状态并保存配置。
- 每次收到有效 IP 响应时，无论 IP 是否变化，都重新同步 Quick Connect 按钮和第一个 `make_connection` 积木。
- UI 同步完成后再通知 IP 等待流程。

## 4. 问题三：端口日志看起来像重复连接

### 现象

同一个 CH340/CH343 端口的名称和 VID/PID 连续显示两次。

### 根因

这两组日志分别表示：

1. `navigator.serial.getPorts()` 枚举到的已授权端口。
2. 用户在浏览器端口选择器中最终选中的端口。

这是同一次连接流程的两个阶段，不是实际打开了两次串口。

### 改进

将英文日志区分为：

```text
Authorized Port 1: CH340/CH343
Selected Port: CH340/CH343
```

同时在 `lang/translations.js` 中增加了中文、英文和日文翻译。

## 5. 问题四：Quaddle 机型无法通过验证和 IP 解析

### 现象

Quaddle 已连接 WiFi，并且串口明确返回 `192.168.2.120`，但页面仍执行三次 `w` 重试并弹出 WiFi 配置框。

### 根因一：机型验证关键词缺少 Quaddle

Quaddle 对 `?` 的响应为：

```text
Quaddle
Q_260916
?
```

但验证正则原来只包含 `Bittle|Nybble|Petoi|Chero`，因此每轮都等待到超时。

### 根因二：Quaddle 的 IP 后面带有状态文本

Quaddle 返回：

```text
IP Address: 192.168.2.120. Wifi already connected
```

原正则要求 IP 后必须立即换行，所以不接受 `. Wifi already connected` 后缀。

### 修复

- 机型验证关键词新增 `Quaddle`。
- IP 正则改为提取 `IP Address:` 后的 IPv4 地址，允许 IP 后存在状态描述。
- 保留 `processDetectedIP()` 对每个 IP 分段进行 `0–255` 范围校验的逻辑。

## 6. 问题五：重复 Quick Connect 流程可能延迟弹出旧的对话框

### 风险

如果端口选择被取消或一个旧流程正在尝试配置 IP，此时又启动新的连接流程，旧流程可能在新串口已成功后才返回失败，从而错误显示 WiFi 配置框。

### 修复

- 新增 `quickConnectPromise`，同一时间只允许一个 Quick Connect 流程。
- Quick Connect 执行期间临时禁用按钮，完成或失败后恢复。
- 重复的 IP 获取请求共享 `wifiCommandPromise`，不重复发送 `w`。
- 串口打开失败或配置 IP 失败后，在显示 WiFi 对话框前重新调用 `hasActiveSerialConnection()`。
- 如果在旧流程等待期间已经建立了新的串口连接，则跳过旧的回退逻辑和对话框。

## 7. 修复后的 Quick Connect 流程

```text
点击 Quick Connect
        │
        ├─ 禁用按钮并建立共享连接 Promise
        │
        ├─ 打开串口、启动读取循环
        │
        ├─ 发送 ? 并等待机型验证完成
        │
        ├─ 发送 w
        │      ├─ 收到有效非 AP IP → 更新内部状态、按钮和积木
        │      ├─ 收到 192.168.4.1 → 显示 WiFi 配置框
        │      └─ 超时 → 最多重试两次
        │
        └─ 完成后恢复 Quick Connect 按钮
```

## 8. 验证结果

### Bittle X

- 串口验证成功后发送 `w`。
- 自动识别机器人最新 IP `192.168.2.118`。
- Quick Connect 按钮更新为最新 IP。
- `connect device` 积木更新为最新 IP。
- 不再误弹出 WiFi 配置框。

### Quaddle

- `Quaddle / Q_260916` 可被正确识别。
- 可从带有状态后缀的文本中提取 `192.168.2.120`。
- Quick Connect 按钮和 `connect device` 积木正常更新。
- 不再误弹出 WiFi 配置框。
- 实机复测完成，未发现新问题。

### 静态检查

- `git diff --check` 通过。
- Bittle 和 Quaddle 两种 IP 返回格式均已进行匹配检查。

## 9. 后续注意事项

- 新增机器人型号时，如果 `?` 的返回不包含已知关键词，需要同步更新 `validateSerialConnection()` 的型号匹配规则。
- 新固件如果修改 `w` 的输出前缀，需要同步更新 `readSerialData()` 中的 `IP Address:` 解析规则。
- `192.168.4.1` 仍特意保留为 AP 模式判断，不应当作已连入家庭/办公 WiFi 的有效地址。
- 浏览器的 Web Serial 需要用户主动选择端口，所以端口选择框被取消后仍可能进入配置 IP 回退流程，这属于预期行为。
