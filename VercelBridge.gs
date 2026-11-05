/**
 * LDM FINANCE — VERCEL API BRIDGE
 * Tambahkan file ini sebagai file script baru bernama VercelBridge.gs.
 * Jangan menaruh secret ini di HTML atau GitHub.
 * Script Property yang wajib: VERCEL_PROXY_SECRET.
 */
function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : "";
    if (!raw || raw.length > 250000) {
      return ldmBridgeJson_({ ok: false, error: "Request tidak valid atau terlalu besar." });
    }

    var request = JSON.parse(raw);
    var expected = String(PropertiesService.getScriptProperties().getProperty("VERCEL_PROXY_SECRET") || "");
    var received = String(request && request.proxySecret || "");
    if (!ldmBridgeSecretEquals_(received, expected)) {
      return ldmBridgeJson_({ ok: false, error: "Akses API ditolak. Proxy secret tidak valid." });
    }

    var action = String(request.action || "");
    var args = Array.isArray(request.args) ? request.args : null;
    var counts = {
      loginAndLoad: 2,
      getAppDataInstant: 1,
      refreshAppData: 1,
      refreshLdmSession: 1,
      logoutLdmSession: 1,
      saveTransaction: 2,
      cancelTransaction: 2,
      saveBudget: 2,
      saveDebt: 2,
      markDebtPaid: 2,
      undoDebtPayment: 2,
      addFundMovement: 2,
      saveSettings: 2,
      getDatabaseStatus: 1
    };

    if (!Object.prototype.hasOwnProperty.call(counts, action) || !args || args.length !== counts[action]) {
      return ldmBridgeJson_({ ok: false, error: "Aksi API tidak diizinkan atau argumen tidak valid." });
    }

    var result;
    switch (action) {
      case "loginAndLoad": result = loginAndLoad(args[0], args[1]); break;
      case "getAppDataInstant": result = getAppDataInstant(args[0]); break;
      case "refreshAppData": result = refreshAppData(args[0]); break;
      case "refreshLdmSession": result = refreshLdmSession(args[0]); break;
      case "logoutLdmSession": result = logoutLdmSession(args[0]); break;
      case "saveTransaction": result = saveTransaction(args[0], args[1]); break;
      case "cancelTransaction": result = cancelTransaction(args[0], args[1]); break;
      case "saveBudget": result = saveBudget(args[0], args[1]); break;
      case "saveDebt": result = saveDebt(args[0], args[1]); break;
      case "markDebtPaid": result = markDebtPaid(args[0], args[1]); break;
      case "undoDebtPayment": result = undoDebtPayment(args[0], args[1]); break;
      case "addFundMovement": result = addFundMovement(args[0], args[1]); break;
      case "saveSettings": result = saveSettings(args[0], args[1]); break;
      case "getDatabaseStatus": result = getDatabaseStatus(args[0]); break;
      default: return ldmBridgeJson_({ ok: false, error: "Aksi tidak diizinkan." });
    }

    return ldmBridgeJson_({ ok: true, data: result });
  } catch (error) {
    console.error("LDM Vercel bridge error: " + String(error && error.message || error));
    return ldmBridgeJson_({
      ok: false,
      error: String(error && error.message || "Terjadi kesalahan pada backend.").slice(0, 700)
    });
  }
}

function ldmBridgeJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function ldmBridgeSecretEquals_(a, b) {
  a = String(a || "");
  b = String(b || "");
  if (!a || !b || a.length !== b.length) return false;
  var difference = 0;
  for (var i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}
