(function (global) {
  "use strict";

  const PRODUCT_STORAGE_KEY = "petoiProductType";
  const DEFAULT_PRODUCT_TYPE = "bittle";

  const PRODUCTS = Object.freeze({
    bittle: Object.freeze({
      name: "Bittle/Bittle X",
      joints: Object.freeze([
        ["jointHeadPanning", "0"],
        ["jointReserved", "1"],
        ["jointReserved", "2"],
        ["jointReserved", "3"],
        ["jointLFArm", "8"],
        ["jointRFArm", "9"],
        ["jointRBArm", "10"],
        ["jointLBArm", "11"],
        ["jointLFKnee", "12"],
        ["jointRFKnee", "13"],
        ["jointRBKnee", "14"],
        ["jointLBKnee", "15"]
      ])
    }),
    nybble: Object.freeze({
      name: "Nybble/Nybble Q",
      joints: Object.freeze([
        ["jointHeadPanning", "0"],
        ["jointHeadTiltingNybble", "1"],
        ["jointTailNybble", "2"],
        ["jointReserved", "3"],
        ["jointLFArm", "8"],
        ["jointRFArm", "9"],
        ["jointRBArm", "10"],
        ["jointLBArm", "11"],
        ["jointLFKnee", "12"],
        ["jointRFKnee", "13"],
        ["jointRBKnee", "14"],
        ["jointLBKnee", "15"]
      ])
    }),
    bittle_arm: Object.freeze({
      name: "Bittle X+Arm",
      joints: Object.freeze([
        ["jointGripperPanning", "0"],
        ["jointGripperLifting", "1"],
        ["jointGripperOpening", "2"],
        ["jointReserved", "3"],
        ["jointLFArm", "8"],
        ["jointRFArm", "9"],
        ["jointRBArm", "10"],
        ["jointLBArm", "11"],
        ["jointLFKnee", "12"],
        ["jointRFKnee", "13"],
        ["jointRBKnee", "14"],
        ["jointLBKnee", "15"]
      ])
    }),
    quaddle: Object.freeze({
      name: "Quaddle/Chero",
      joints: Object.freeze([
        ["jointHeadPanning", "0"],
        ["jointLFLeg", "2"],
        ["jointRFLeg", "3"],
        ["jointRBLeg", "4"],
        ["jointLBLeg", "5"]
      ])
    })
  });

  function isValidProductType(productType) {
    return Object.prototype.hasOwnProperty.call(PRODUCTS, productType);
  }

  function getProductTypeFromUrl() {
    const productType = new URLSearchParams(global.location.search).get("product");
    return isValidProductType(productType) ? productType : "";
  }

  function storeProductType(productType) {
    if (!isValidProductType(productType)) return false;
    try {
      global.localStorage.setItem(PRODUCT_STORAGE_KEY, productType);
    } catch (error) {
      console.warn("Failed to store product type:", error);
    }
    return true;
  }

  function getStoredProductType() {
    try {
      const productType = global.localStorage.getItem(PRODUCT_STORAGE_KEY);
      return isValidProductType(productType) ? productType : "";
    } catch (error) {
      console.warn("Failed to read stored product type:", error);
      return "";
    }
  }

  function getJointOptions(getLabel, productType) {
    const selectedType = isValidProductType(productType)
      ? productType
      : getProductTypeFromUrl() || DEFAULT_PRODUCT_TYPE;
    return PRODUCTS[selectedType].joints.map(function (joint) {
      return [getLabel(joint[0]) + " (" + joint[1] + ")", joint[1]];
    });
  }

  global.PetoiProducts = Object.freeze({
    storageKey: PRODUCT_STORAGE_KEY,
    defaultType: DEFAULT_PRODUCT_TYPE,
    products: PRODUCTS,
    isValidType: isValidProductType,
    fromUrl: getProductTypeFromUrl,
    fromStorage: getStoredProductType,
    store: storeProductType,
    getJointOptions: getJointOptions
  });
})(window);
