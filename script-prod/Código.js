function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚙️ Fantasy VCV')
      .addItem('Sincronizar Permisos Automáticamente', 'sincronizarPermisosLigas')
      .addToUi();
}

function sincronizarPermisosLigas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var shPermisos = ss.getSheetByName("Permisos_Equipos");
  var shLigas = ss.getSheetByName("Ligas");
  var shLigasEq = ss.getSheetByName("Ligas_Equipos");
  var shUsuarios = ss.getSheetByName("Usuarios");

  if(!shPermisos || !shLigas || !shLigasEq || !shUsuarios) {
    SpreadsheetApp.getUi().alert("❌ Error: No se encuentran las pestañas necesarias.");
    return;
  }

  // 1. AUTO-AÑADIR USUARIOS A LA PESTAÑA DE PERMISOS SI NO ESTÁN
  var usuariosData = getSafeData(shUsuarios);
  var permisosData = getSafeData(shPermisos);
  var nombresEnPermisos = [];
  
  for (var p = 1; p < permisosData.length; p++) {
      if(permisosData[p][0]) nombresEnPermisos.push(permisosData[p][0].toString());
  }

  var usuariosAñadidos = 0;
  for (var u = 1; u < usuariosData.length; u++) {
      var nombreUsr = usuariosData[u][0];
      if (nombreUsr && nombresEnPermisos.indexOf(nombreUsr.toString()) === -1) {
          var nuevaFila = new Array(permisosData[0].length).fill("");
          nuevaFila[0] = nombreUsr;
          shPermisos.appendRow(nuevaFila);
          usuariosAñadidos++;
      }
  }

  permisosData = getSafeData(shPermisos);
  var dataLigas = getSafeData(shLigas);
  var dataLigasEq = getSafeData(shLigasEq);

  var ligasHeaders = dataLigas[0];
  var ligasEqHeaders = dataLigasEq[0];
  var permHeaders = permisosData[0];

  var ligasMap = {};
  for (var i = 1; i < dataLigasEq.length; i++) {
      var lName = dataLigasEq[i][0];
      ligasMap[lName] = [];
      for (var j = 1; j < ligasEqHeaders.length; j++) {
          if (dataLigasEq[i][j] && dataLigasEq[i][j].toString().toUpperCase() === "X") {
              ligasMap[lName].push(ligasEqHeaders[j]);
          }
      }
  }

  var colEqPermisos = {};
  for(var j=1; j<permHeaders.length; j++){ colEqPermisos[permHeaders[j]] = j; }

  var updates = false;
  for (var i = 1; i < dataLigas.length; i++) {
      var usr = dataLigas[i][0];
      if (!usr) continue;

      var rowP = -1;
      for(var r=1; r<permisosData.length; r++){
          if(permisosData[r][0] == usr) { rowP = r; break; }
      }
      if(rowP === -1) continue; 

      for (var j = 1; j < ligasHeaders.length; j++) {
          if (dataLigas[i][j] && dataLigas[i][j].toString().toUpperCase() === "X") {
              var lName = ligasHeaders[j];
              var equiposDeEstaLiga = ligasMap[lName] || [];
              for(var k=0; k<equiposDeEstaLiga.length; k++){
                  var eq = equiposDeEstaLiga[k];
                  var idxCol = colEqPermisos[eq];
                  if (idxCol && permisosData[rowP][idxCol] !== "X") {
                      permisosData[rowP][idxCol] = "X";
                      updates = true;
                  }
              }
          }
      }
  }

  if (updates) {
      shPermisos.getRange(1, 1, permisosData.length, permisosData[0].length).setValues(permisosData);
      SpreadsheetApp.getUi().alert("✅ ¡Permisos sincronizados!\nSe han añadido " + usuariosAñadidos + " usuarios nuevos y se han actualizado las 'X' faltantes.");
  } else if (usuariosAñadidos > 0) {
      SpreadsheetApp.getUi().alert("✅ Se han añadido " + usuariosAñadidos + " usuarios nuevos a la pestaña de Permisos. No faltaban 'X'.");
  } else {
      SpreadsheetApp.getUi().alert("ℹ️ Todo está en orden. No hay usuarios nuevos ni faltaban 'X'.");
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({"status": "ok"})).setMimeType(ContentService.MimeType.JSON);
}



  // HELPER PARA EVITAR QUE GOOGLE SHEETS ROMPA TEXTOS COMO "3-1" O "25-20" CONVIRTIENDOLOS A FECHAS
  function parseSheetText(val) {
      if (val && typeof val.getDate === 'function') {
          return val.getDate() + "-" + (val.getMonth() + 1);
      } else if (val !== undefined && val !== null) {
          return val.toString().trim();
      }
      return "";
  }

  function getSafeData(sheet) {
    if (!sheet) return [];
    var sheetName = sheet.getName();

    // 1. Mirar primero en la memoria RAM (Caché). Si ya está en memoria, devolver inmediatamente sin tocar la hoja
    var cache = CacheService.getScriptCache();
    var cacheKey = "vcv_sheet_" + sheetName;

    if (sheetName !== "Porras") {
        var cached = cache.get(cacheKey);
        if (cached) {
            try { return JSON.parse(cached); } catch(e) {}
        }
    }

    // 2. Solo si NO está en caché (o es Porras), consultamos a Google Sheets
    var lr = sheet.getLastRow();
    var lc = sheet.getLastColumn();

    if (sheetName === "Porras") {
        if (lr > 0 && lc > 0) return sheet.getRange(1, 1, lr, lc).getValues();
        return [];
    }

    var data = [];
    if (lr > 0 && lc > 0) {
        data = sheet.getRange(1, 1, lr, lc).getValues();
    }

    if (data.length > 0) {
        try {
            var str = JSON.stringify(data);
            if (str.length < 90000) { cache.put(cacheKey, str, 21600); } 
        } catch(e) {}
    }

    return data;
}

function clearAllCache() {
    var keys = ["vcv_sheet_Usuarios", "vcv_sheet_Ajustes", "vcv_sheet_Partidos", "vcv_sheet_Permisos_Equipos", "vcv_sheet_Ligas", "vcv_sheet_Ligas_Equipos", "vcv_sheet_Porras", "vcv_sheet_Resultados Oficiales", "vcv_sheet_Reglas_Puntuacion", "vcv_sheet_Insignias", "vcv_sheet_Peticiones_Nombre", "vcv_sheet_Predicciones_Secretas", "vcv_sheet_Permisos_Secreta"];
    try { CacheService.getScriptCache().removeAll(keys); } catch(e) {}
}

function doPost(e) {

  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
      var isWriteAction = ["save", "save_resultado_admin", "add_user", "sync_permisos", "change_password", "request_name_change", "save_totales"].indexOf(action) !== -1;

      // ACCIÓN DE PING (PRE-FETCHING)
      if (action === "ping") {
          // Leer una celda cualquiera para asegurar que la conexión a Google Sheets se despierte
          try { SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Ajustes").getRange("A1").getValue(); } catch(e){}
          return ContentService.createTextOutput(JSON.stringify({"status": "ok"})).setMimeType(ContentService.MimeType.JSON);
      }

    var usuario = params.usuario;
    var password = params.password;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetUsuarios = ss.getSheetByName("Usuarios");
    var sheetAjustes = ss.getSheetByName("Ajustes"); 
    var sheetPermisos = ss.getSheetByName("Permisos_Equipos");
    var sheetLigas = ss.getSheetByName("Ligas");
    var sheetLigasEq = ss.getSheetByName("Ligas_Equipos");
    var sheetPorras = ss.getSheetByName("Porras");
    var sheetResultados = ss.getSheetByName("Resultados Oficiales");
    var sheetReglas = ss.getSheetByName("Reglas_Puntuacion");

    // VALIDACIÓN RÁPIDA DE USUARIO (Para acciones de Admin)
    var esAdminAutenticado = false;
    if (usuario && password) {
        var dataU = getSafeData(sheetUsuarios);
        for (var i = 1; i < dataU.length; i++) {
            if (dataU[i][0] == usuario && dataU[i][1] == password) {
                var shIns = ss.getSheetByName("Insignias");
                if (shIns) {
                    var dataIns = getSafeData(shIns);
                    for(var j=1; j<dataIns.length; j++) {
                        if(dataIns[j][0] == usuario && dataIns[j][5] && dataIns[j][5].toString().toUpperCase() === "X") {
                            esAdminAutenticado = true; break;
                        }
                    }
                }
                break;
            }
        }
    }

    // --- ACCIONES DE INTRANET (ADMINISTRADOR) ---
    if (action === "sync_permisos") {
        if (!esAdminAutenticado) return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Permiso denegado."})).setMimeType(ContentService.MimeType.JSON);
        
        var usuariosData = getSafeData(sheetUsuarios);
        var permisosData = getSafeData(sheetPermisos);
        var nombresEnPermisos = [];
        for (var p = 1; p < permisosData.length; p++) { if(permisosData[p][0]) nombresEnPermisos.push(permisosData[p][0].toString()); }
        
        var usuariosAñadidos = 0;
        for (var u = 1; u < usuariosData.length; u++) {
            var nombreUsr = usuariosData[u][0];
            if (nombreUsr && nombresEnPermisos.indexOf(nombreUsr.toString()) === -1) {
                var nuevaFila = new Array(permisosData[0].length).fill("");
                nuevaFila[0] = nombreUsr;
                sheetPermisos.appendRow(nuevaFila);
                usuariosAñadidos++;
            }
        }
        
        permisosData = getSafeData(sheetPermisos);
        var dataLigas = getSafeData(sheetLigas);
        var dataLigasEq = getSafeData(sheetLigasEq);
        var ligasHeaders = dataLigas[0];
        var ligasEqHeaders = dataLigasEq[0];
        var permHeaders = permisosData[0];
        
        var ligasMapAdmin = {};
        for (var i = 1; i < dataLigasEq.length; i++) {
            var lNameAdmin = dataLigasEq[i][0];
            ligasMapAdmin[lNameAdmin] = [];
            for (var j = 1; j < ligasEqHeaders.length; j++) {
                if (dataLigasEq[i][j] && dataLigasEq[i][j].toString().toUpperCase() === "X") { ligasMapAdmin[lNameAdmin].push(ligasEqHeaders[j]); }
            }
        }
        
        var colEqPermisos = {};
        for(var j=1; j<permHeaders.length; j++){ colEqPermisos[permHeaders[j]] = j; }
        
        var updatesAdmin = false;
        for (var i = 1; i < dataLigas.length; i++) {
            var usrA = dataLigas[i][0];
            if (!usrA) continue;
            var rowP = -1;
            for(var r=1; r<permisosData.length; r++){ if(permisosData[r][0] == usrA) { rowP = r; break; } }
            if(rowP === -1) continue; 
            for (var j = 1; j < ligasHeaders.length; j++) {
                if (dataLigas[i][j] && dataLigas[i][j].toString().toUpperCase() === "X") {
                    var lNameAdmin2 = ligasHeaders[j];
                    var equiposDeEstaLiga = ligasMapAdmin[lNameAdmin2] || [];
                    for(var k=0; k<equiposDeEstaLiga.length; k++){
                        var eqAdmin = equiposDeEstaLiga[k];
                        var idxCol = colEqPermisos[eqAdmin];
                        if (idxCol && permisosData[rowP][idxCol] !== "X") {
                            permisosData[rowP][idxCol] = "X";
                            updatesAdmin = true;
                        }
                    }
                }
            }
        }
        
        if (updatesAdmin) {
            sheetPermisos.getRange(1, 1, permisosData.length, permisosData[0].length).setValues(permisosData);
            clearAllCache(); return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": "✅ Sincronizado (" + usuariosAñadidos + " usuarios nuevos)." })).setMimeType(ContentService.MimeType.JSON);
        } else if (usuariosAñadidos > 0) {
            clearAllCache(); return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": "✅ Añadidos " + usuariosAñadidos + " usuarios nuevos." })).setMimeType(ContentService.MimeType.JSON);
        } else {
            return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": "✅ Todo al día. Nada que sincronizar." })).setMimeType(ContentService.MimeType.JSON);
        }
    }

    if (action === "add_user") {
        if (!esAdminAutenticado) return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Permiso denegado."})).setMimeType(ContentService.MimeType.JSON);
        
        var newU = params.new_u ? params.new_u.toString().trim() : "";
        var newP = params.new_p ? params.new_p.toString().trim() : "";
        var newN = params.new_n ? params.new_n.toString().trim() : "";
        
        if (!newU || !newP) {
            return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "El usuario y la contraseña son obligatorios."})).setMimeType(ContentService.MimeType.JSON);
        }
        
        var dataUsr = getSafeData(sheetUsuarios);
        for(var i=1; i<dataUsr.length; i++) {
            if(dataUsr[i][0] && dataUsr[i][0].toString().toLowerCase() === newU.toLowerCase()) {
                return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": " El usuario ya existe en la base de datos."})).setMimeType(ContentService.MimeType.JSON);
            }
        }
        
        // Find first empty row in Usuarios
        var valsU = sheetUsuarios.getRange(1, 1, sheetUsuarios.getMaxRows(), 1).getValues();
        var firstEmptyU = 1;
        for(var j=0; j<valsU.length; j++){
            if(!valsU[j][0] || valsU[j][0].toString().trim() === "") {
                firstEmptyU = j + 1;
                break;
            }
        }
        sheetUsuarios.getRange(firstEmptyU, 1).setValue(newU);
        sheetUsuarios.getRange(firstEmptyU, 2).setValue(newP);
        sheetUsuarios.getRange(firstEmptyU, 3).setValue(newN);
        
        // Also add to other sheets
        var sheetsToAppend = ["Permisos_Equipos", "Ligas", "Insignias", "Permisos_Secreta"];
        for(var i=0; i<sheetsToAppend.length; i++) {
            var shName = sheetsToAppend[i];
            var sh = ss.getSheetByName(shName);
            if(sh) {
                var vals = sh.getRange(1, 1, sh.getMaxRows(), 1).getValues();
                var firstEmpty = 1;
                for(var j=0; j<vals.length; j++){
                    if(!vals[j][0] || vals[j][0].toString().trim() === "") {
                        firstEmpty = j + 1;
                        break;
                    }
                }
                sh.getRange(firstEmpty, 1).setValue(newU);
                
                if (shName === "Ligas" && params.ligas_seleccionadas && params.ligas_seleccionadas.length > 0) {
                    var ligasSel = params.ligas_seleccionadas;
                    var ligasHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
                    for (var rL = 0; rL < ligasSel.length; rL++) {
                        var targetLiga = ligasSel[rL].toString().trim().toLowerCase();
                        for (var col = 0; col < ligasHeaders.length; col++) {
                            if (ligasHeaders[col] && ligasHeaders[col].toString().trim().toLowerCase() === targetLiga) {
                                sh.getRange(firstEmpty, col + 1).setValue("X");
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        clearAllCache(); 
        return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": " Usuario '" + newU + "' creado e insertado en todas las tablas."})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "save_resultado_admin") {
        if (!esAdminAutenticado) return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Permiso denegado."})).setMimeType(ContentService.MimeType.JSON);
        
        var idPart = params.id_partido;
        var sets = params.sets || "";
        var parciales = params.parciales || "";
        var streaming = params.streaming || "";
          
          if (!sheetResultados) {
              sheetResultados = ss.insertSheet("Resultados Oficiales");
              sheetResultados.appendRow(["ID_Partido", "Sets", "Parciales", "Streaming"]);
          }
          var dataResAdmin = getSafeData(sheetResultados);
          var rowFound = -1;
          for(var r=1; r<dataResAdmin.length; r++) {
              if(dataResAdmin[r][0].toString().trim() === idPart) { rowFound = r + 1; break; }
          }
          if(rowFound !== -1) {
              sheetResultados.getRange(rowFound, 2).setValue(sets);
              sheetResultados.getRange(rowFound, 3).setValue(parciales);
              sheetResultados.getRange(rowFound, 4).setValue(streaming);
          } else {
              sheetResultados.appendRow([idPart, sets, parciales, streaming]);
          }
        clearAllCache(); return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // --- ACCIONES DE GESTIÓN DE CONTRASEÑA Y NOMBRE ---
    if (action === "change_password") {
        var oldPwd = params.old_password;
        var newPwd = params.new_password;
        var dataU = getSafeData(sheetUsuarios);
        var found = false;
        for (var i = 1; i < dataU.length; i++) {
            if (dataU[i][0] == usuario && dataU[i][1] == oldPwd) {
                sheetUsuarios.getRange(i + 1, 2).setValue(newPwd); 
                found = true;
                break;
            }
        }
        if (found) { clearAllCache(); return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": "¡Contraseña actualizada con éxito!"})).setMimeType(ContentService.MimeType.JSON); } 
        else { return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Usuario o contraseña actual incorrectos."})).setMimeType(ContentService.MimeType.JSON); }
    }

    if (action === "request_name_change") {
        var newUsr = params.new_usuario ? params.new_usuario.trim() : "";
        var newName = params.new_nombre ? params.new_nombre.trim() : "";
        var dataU = getSafeData(sheetUsuarios);
        var validReq = false;
        var userExists = false;
        for (var i = 1; i < dataU.length; i++) {
            if (dataU[i][0] == usuario && dataU[i][1] == password) { validReq = true; }
            if (newUsr && dataU[i][0] && dataU[i][0].toString().toLowerCase() === newUsr.toLowerCase()) { userExists = true; }
        }
        if (!validReq) { return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Usuario o contraseña actual incorrectos."})).setMimeType(ContentService.MimeType.JSON); }
        if (userExists) { return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "❌ Ese nombre de usuario ya está en uso. Por favor, elige otro."})).setMimeType(ContentService.MimeType.JSON); }
        var sheetPeticiones = ss.getSheetByName("Peticiones_Nombre");
        if (!sheetPeticiones) {
            sheetPeticiones = ss.insertSheet("Peticiones_Nombre");
            sheetPeticiones.appendRow(["Fecha", "Usuario Actual", "Nuevo Usuario Sol", "Nuevo Nombre Sol", "Estado"]);
            sheetPeticiones.getRange("A1:E1").setFontWeight("bold").setBackground("#d9d2e9");
        }
        sheetPeticiones.appendRow([new Date(), usuario, newUsr, newName, "Escribe OK para aprobar"]);
        clearAllCache(); return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": "Solicitud enviada. El administrador revisará tu petición."})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "save_totales") {
        var deadline = new Date(2026, 9, 3, 0, 0, 0).getTime();
        if (new Date().getTime() >= deadline) { return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "El plazo para enviar predicciones totales ha cerrado."})).setMimeType(ContentService.MimeType.JSON); }

        var sheetPrediccionesTotales = ss.getSheetByName("Predicciones_Secretas");
        if (!sheetPrediccionesTotales) {
            sheetPrediccionesTotales = ss.insertSheet("Predicciones_Secretas");
            sheetPrediccionesTotales.appendRow(["Fecha", "Usuario", "Equipo", "Puntos Predichos"]);
            sheetPrediccionesTotales.getRange("A1:D1").setFontWeight("bold").setBackground("#cfe2f3");
        }
        var pData = getSafeData(sheetPrediccionesTotales);
        for (var i = pData.length - 1; i >= 1; i--) {
            if (pData[i][1] == usuario && params.predicciones_totales[pData[i][2]] !== undefined) { sheetPrediccionesTotales.deleteRow(i + 1); }
        }
        for (var eq in params.predicciones_totales) {
            var pts = params.predicciones_totales[eq];
            if (pts !== "") { sheetPrediccionesTotales.appendRow([new Date(), usuario, eq, pts]); }
        }
        clearAllCache(); return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": "¡Tus predicciones a final de temporada han sido guardadas!"})).setMimeType(ContentService.MimeType.JSON);
    }

    // LEER RESULTADOS OFICIALES
    var resData = getSafeData(sheetResultados);
    var resultadosMap = {}; 
    for(var i=1; i<resData.length; i++) {
        if(resData[i][0]) { resultadosMap[resData[i][0].toString().trim()] = { sets: parseSheetText(resData[i][1]), parciales: parseSheetText(resData[i][2]), streaming: resData[i][3] ? resData[i][3].toString().trim() : '' }; }
    }

    // LEER TODOS LOS PARTIDOS (AJUSTES)
    var ajustesData = getSafeData(sheetAjustes);
    var partidos = [];
    var nowMs = new Date().getTime();
    var changesMade = false;
    var updatesColumnas = []; 

    for(var i=1; i<ajustesData.length; i++) {
        if(!ajustesData[i][0]) { updatesColumnas.push(["", ""]); continue; }
        var idPart = ajustesData[i][0].toString().trim();
        var rFechaRaw = ajustesData[i][5];
        var rTimestamp = "";
        
        if(rFechaRaw instanceof Date) { rTimestamp = rFechaRaw.getTime(); } 
        else if(rFechaRaw) {
            var fStr = rFechaRaw.toString().trim();
            var parts = fStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{1,2})/);
            if (parts) { rTimestamp = new Date(parts[3], parts[2]-1, parts[1], parts[4], parts[5]).getTime(); }
            else { var d = new Date(fStr); if(!isNaN(d.getTime())) rTimestamp = d.getTime(); }
        }

        var estadoActual = ajustesData[i][7] ? ajustesData[i][7].toString().trim().toUpperCase() : "CERRADO";
        var visibilidadActual = ajustesData[i][8] ? ajustesData[i][8].toString().trim().toUpperCase() : "OCULTAR";
        var nuevoEstado = estadoActual;
        var nuevaVisibilidad = visibilidadActual;

        if(rTimestamp && nowMs >= (rTimestamp)) { nuevoEstado = "CERRADO"; }
        if(rTimestamp && nowMs >= (rTimestamp + 48 * 60 * 60 * 1000)) {
            nuevoEstado = "CERRADO"; nuevaVisibilidad = "OCULTAR";
        }
        if(nuevoEstado !== estadoActual || nuevaVisibilidad !== visibilidadActual) { changesMade = true; }
        updatesColumnas.push([nuevoEstado, nuevaVisibilidad]);

        var equipoLocal = ajustesData[i][2] ? ajustesData[i][2].toString().trim() : "";
        var rival = ajustesData[i][3] ? ajustesData[i][3].toString().trim() : "";
        var oRes = resultadosMap[idPart];
        var catTorneo = ajustesData[i][9] ? ajustesData[i][9].toString().trim() : "";
        var pabellonLocalizacion = ajustesData[i][10] ? ajustesData[i][10].toString().trim() : "";
        var abrevF = ajustesData[i][11] ? ajustesData[i][11].toString().trim() : "";
        var abrevR = ajustesData[i][12] ? ajustesData[i][12].toString().trim() : "";

        partidos.push({
            id_partido: idPart, ronda_global: ajustesData[i][1] ? ajustesData[i][1].toString().trim() : "0",
            equipo_local: equipoLocal, rival: rival, jornada_eq: ajustesData[i][4] ? ajustesData[i][4].toString().trim() : "",
            timestamp: rTimestamp, ubicacion: ajustesData[i][6] ? ajustesData[i][6].toString().trim().toUpperCase() : "",
            estado: nuevoEstado, visibilidad: nuevaVisibilidad,
            oficial_sets: oRes ? oRes.sets : "", oficial_parciales: oRes ? oRes.parciales : "",
            categoria: catTorneo, pabellon: pabellonLocalizacion,
            abrev_local: abrevF, abrev_rival: abrevR
        });
    }

    if(changesMade && updatesColumnas.length > 0) { sheetAjustes.getRange(2, 8, updatesColumnas.length, 2).setValues(updatesColumnas); clearAllCache(); }

    // ACCIÓN ESPECIAL: INVITADO
    if (action === "clear_cache") {
        if (!esAdminAutenticado) return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Permiso denegado."})).setMimeType(ContentService.MimeType.JSON);
        clearAllCache();
        return ContentService.createTextOutput(JSON.stringify({"status": "success", "message": " Cch borrada. Todo actualizado con el Excel."})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "login_guest") {
        var dataPermisos = getSafeData(sheetPermisos);
        var eqHeaders = dataPermisos[0]; 
        var misPermisosInvitado = {}; 
        var rowPermisosInvitado = -1;
        for(var i=1; i<dataPermisos.length; i++){ if(dataPermisos[i][0] && dataPermisos[i][0].toString().toUpperCase() === "INVITADO") { rowPermisosInvitado = i; break; } }
        if(rowPermisosInvitado !== -1) {
            for(var j=1; j<eqHeaders.length; j++) { misPermisosInvitado[eqHeaders[j]] = (dataPermisos[rowPermisosInvitado][j] && dataPermisos[rowPermisosInvitado][j].toString().toUpperCase() === "X"); }
        }
        var carteleraInvitado = [];
        var idsEnInvitado = {};
        for(var p=0; p<partidos.length; p++) {
            var esLoc = misPermisosInvitado[partidos[p].equipo_local] === true;
            var esRiv = misPermisosInvitado[partidos[p].rival] === true;
            if(esLoc || esRiv) {
                var pId = partidos[p].id_partido;
                var pCopy = JSON.parse(JSON.stringify(partidos[p]));
                if(esLoc && esRiv) pCopy.es_derby = true;
                
                if(!idsEnInvitado[pId]) {
                    carteleraInvitado.push(pCopy);
                    idsEnInvitado[pId] = pCopy;
                } else {
                    if(esLoc && esRiv) idsEnInvitado[pId].es_derby = true;
                }
            }
        }
        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "equipos": carteleraInvitado })).setMimeType(ContentService.MimeType.JSON);
    }

    // ACCIONES DE USUARIO REGISTRADO
    var dataUsuarios = getSafeData(sheetUsuarios);
    var valid = false;
    var mapNombresReales = {}; 
    var filaUsuario = -1;
    for (var i = 1; i < dataUsuarios.length; i++) {
      var u = dataUsuarios[i][0];
      if(u) { mapNombresReales[u] = dataUsuarios[i][2] ? dataUsuarios[i][2].toString().trim() : u; }
      if (u == usuario && dataUsuarios[i][1] == password) { 
          valid = true; 
          filaUsuario = i + 1;
      }
    }
    if (!valid) return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "Usuario o contraseña incorrectos."})).setMimeType(ContentService.MimeType.JSON);
    
    // Registrar Último Acceso si es login o get_data
    var miNombreReal = mapNombresReales[usuario] || usuario;

    // LEER INSIGNIAS/VERIFICADOS
    var sheetInsignias = ss.getSheetByName("Insignias");
    var insigniasMap = {};
    if (sheetInsignias) {
        var dataIns = getSafeData(sheetInsignias);
        for(var i=1; i<dataIns.length; i++) {
            var usrRow = dataIns[i][0];
            if(!usrRow) continue;
            if(!insigniasMap[usrRow]) insigniasMap[usrRow] = [];
            
            var vJug = dataIns[i][1] ? dataIns[i][1].toString().trim() : "";
            var vEnt = dataIns[i][2] ? dataIns[i][2].toString().trim() : "";
            var vStf = dataIns[i][3] ? dataIns[i][3].toString().trim() : "";
            var vExj = dataIns[i][4] ? dataIns[i][4].toString().toUpperCase().trim() : "";
            var vAdm = dataIns[i][5] ? dataIns[i][5].toString().toUpperCase().trim() : "";

            if (vAdm === "X") insigniasMap[usrRow].push({ type: 'admin', text: 'Admin Web' });
            if (vStf) insigniasMap[usrRow].push({ type: 'staff', text: vStf });
            if (vEnt) insigniasMap[usrRow].push({ type: 'entrenador', text: 'Entrenador (' + vEnt + ')' });
            if (vJug) insigniasMap[usrRow].push({ type: 'jugador', text: 'Jugador (' + vJug + ')' });
            if (vExj === "X") insigniasMap[usrRow].push({ type: 'exjugador', text: 'Exjugador VCV' });
        }
    }

    var reglas = sheetReglas.getRange("B2:B5").getValues();
    var ptsSets = parseInt(reglas[0][0]) || 0;
    var ptsGanador = parseInt(reglas[1][0]) || 0;
    var ptsDiffExacta = parseInt(reglas[2][0]) || 0;
    var maxDistancia = parseInt(reglas[3][0]) || 0;

    // LÓGICA DE PERMISOS COMBINADOS (LIGAS + EXPLÍCITOS)
    var dataLigas = getSafeData(sheetLigas);
    var headersLigas = dataLigas[0];
    var misLigas = [];
    var rowLigas = -1;
    for(var i=1; i<dataLigas.length; i++){ if(dataLigas[i][0] == usuario) { rowLigas = i; break; } }
    if(rowLigas !== -1) {
       for(var col=1; col<headersLigas.length; col++) {
         if(dataLigas[rowLigas][col] && dataLigas[rowLigas][col].toString().toUpperCase() === "X") misLigas.push(headersLigas[col]);
       }
    }

    var ligasEqData = getSafeData(sheetLigasEq);
    var ligasEqHeaders = ligasEqData[0]; 
    var ligasMap = {}; 
    var misEquiposPorLiga = {}; 
    for(var i=1; i<ligasEqData.length; i++) {
        var ligaName = ligasEqData[i][0];
        ligasMap[ligaName] = [];
        for(var j=1; j<ligasEqHeaders.length; j++) {
            if(ligasEqData[i][j] && ligasEqData[i][j].toString().toUpperCase() === "X") { 
                var equipoActual = ligasEqHeaders[j];
                ligasMap[ligaName].push(equipoActual); 
                if (misLigas.indexOf(ligaName) !== -1) { misEquiposPorLiga[equipoActual] = true; }
            }
        }
    }

    var dataPermisos = getSafeData(sheetPermisos);
    var eqHeaders = dataPermisos[0]; 
    var misPermisos = {}; 
    var rowPermisos = -1;
    for(var i=1; i<dataPermisos.length; i++){ if(dataPermisos[i][0] == usuario) { rowPermisos = i; break; } }
    
    if (rowPermisos === -1) {
        var nuevaFilaPermiso = new Array(eqHeaders.length).fill("");
        nuevaFilaPermiso[0] = usuario;
        sheetPermisos.appendRow(nuevaFilaPermiso); clearAllCache();
        rowPermisos = dataPermisos.length; 
        dataPermisos.push(nuevaFilaPermiso);
    }

    for(var j=1; j<eqHeaders.length; j++) { 
        if(dataPermisos[rowPermisos][j] && dataPermisos[rowPermisos][j].toString().toUpperCase() === "X") {
            misPermisos[eqHeaders[j]] = true;
        }
    }

    // APLICAR PERMISOS AL USUARIO
    for(var p=0; p<partidos.length; p++) { 
        var eqLoc = partidos[p].equipo_local;
        if (misEquiposPorLiga[eqLoc] === true && misPermisos[eqLoc] !== true) {
            misPermisos[eqLoc] = true;
            var colIndex = -1;
            for(var x=1; x<eqHeaders.length; x++){ if(eqHeaders[x] === eqLoc) { colIndex = x; break; } }
            if (colIndex !== -1 && rowPermisos !== -1) {
                sheetPermisos.getRange(rowPermisos + 1, colIndex + 1).setValue("X");
            }
        }
        partidos[p].permitido = (misPermisos[partidos[p].equipo_local] === true || misPermisos[partidos[p].rival] === true);
    }

    var porrasData = getSafeData(sheetPorras);
    var porrasMap = {}; 
    for(var i=1; i<porrasData.length; i++) {
        var pUser = porrasData[i][1];
        var pIdPart = porrasData[i][2].toString().trim();
        if(!porrasMap[pUser]) porrasMap[pUser] = {};
        porrasMap[pUser][pIdPart] = { sets: parseSheetText(porrasData[i][3]), puntos: porrasData[i][4], signo: porrasData[i][5] };
    }

    if (action === "login" || action === "get_data") {
        
        // PREDICCIONES SECRETA (PUNTOS TOTALES)
        var sheetPermisosGen = ss.getSheetByName("Permisos_Secreta");
        var sheetPrediccionesTotales = ss.getSheetByName("Predicciones_Secretas");
        var misEquiposTotales = [];
        
        if (sheetPermisosGen) {
            var dataPG = getSafeData(sheetPermisosGen);
            var headersPG = dataPG[0];
            var rowPG = -1;
            for(var i=1; i<dataPG.length; i++){ if(dataPG[i][0] == usuario) { rowPG = i; break; } }
            if(rowPG !== -1) {
                for(var j=1; j<headersPG.length; j++) {
                    if(dataPG[rowPG][j] && dataPG[rowPG][j].toString().toUpperCase() === "X") { misEquiposTotales.push(headersPG[j]); }
                }
            }
        }

        var puntosRealesTotales = {};
        for (var i=0; i<partidos.length; i++) {
            var p = partidos[i];
            if (p.oficial_sets) {
                var sL = parseInt(p.oficial_sets.split("-")[0]);
                var sV = parseInt(p.oficial_sets.split("-")[1]);
                if(!puntosRealesTotales[p.equipo_local]) puntosRealesTotales[p.equipo_local] = 0;
                if (sL === 3 && sV <= 1) { puntosRealesTotales[p.equipo_local] += 3; } 
                else if (sL === 3 && sV === 2) { puntosRealesTotales[p.equipo_local] += 2; } 
                else if (sL === 2 && sV === 3) { puntosRealesTotales[p.equipo_local] += 1; } 
            }
        }

        var prediccionesTotalesMap = {};
        if (sheetPrediccionesTotales && misEquiposTotales.length > 0) {
            var ptData = getSafeData(sheetPrediccionesTotales);
            for (var i=1; i<ptData.length; i++) {
                var uPT = ptData[i][1];
                var eqPT = ptData[i][2];
                var ptsPT = parseInt(ptData[i][3]) || 0;
                if (misEquiposTotales.indexOf(eqPT) !== -1) {
                    if (!prediccionesTotalesMap[eqPT]) prediccionesTotalesMap[eqPT] = [];
                    var nReal = mapNombresReales[uPT] || uPT;
                    prediccionesTotalesMap[eqPT].push({ usuario: uPT, nombre: nReal, puntos: ptsPT });
                }
            }
            for (var eq in prediccionesTotalesMap) {
                prediccionesTotalesMap[eq].sort(function(a, b) { return b.puntos - a.puntos; });
            }
        }

        var puntosPorUsuarioYLiga = {};
        var statsPorUsuarioYLiga = {};
        for(var i=1; i<dataLigas.length; i++){
            var u = dataLigas[i][0];
            if(u) { 
                puntosPorUsuarioYLiga[u] = {}; 
                statsPorUsuarioYLiga[u] = {};
                for(var l=0; l<misLigas.length; l++){ 
                    puntosPorUsuarioYLiga[u][misLigas[l]] = 0; 
                    statsPorUsuarioYLiga[u][misLigas[l]] = { porJornada: {} };
                } 
            }
        }

        var permisosGlobalesMap = {};
        for (var r=1; r<dataPermisos.length; r++) {
            var usrPerm = dataPermisos[r][0];
            if (usrPerm) {
                permisosGlobalesMap[usrPerm] = {};
                for(var j=1; j<eqHeaders.length; j++) {
                    permisosGlobalesMap[usrPerm][eqHeaders[j]] = (dataPermisos[r][j] && dataPermisos[r][j].toString().toUpperCase() === "X");
                }
            }
        }

        var mapPartidosRapido = {};
        for(var pm=0; pm<partidos.length; pm++) mapPartidosRapido[partidos[pm].id_partido] = partidos[pm];

        for(var pUser in porrasMap) {
            if(!puntosPorUsuarioYLiga[pUser]) continue;
            for(var pIdPart in porrasMap[pUser]) {
                var uPred = porrasMap[pUser][pIdPart];
                var oRes = resultadosMap[pIdPart];
                if(!oRes || !oRes.sets || !oRes.parciales || !uPred.sets) continue;
                var partidoInfo = mapPartidosRapido[pIdPart];
                if(!partidoInfo) continue;

                var oLocalWin = parseInt(oRes.sets.split("-")[0]) > parseInt(oRes.sets.split("-")[1]);
                var oDiff = 0;
                var setsParciales = oRes.parciales.split(",");
                if (setsParciales.length === 1 && !oRes.parciales.includes("-") && !isNaN(parseInt(oRes.parciales))) {
                    oDiff = parseInt(oRes.parciales);
                } else {
                    for(var sp=0; sp<setsParciales.length; sp++){
                        var nums = setsParciales[sp].split("-");
                        if(nums.length==2) oDiff += (parseInt(nums[0]) - parseInt(nums[1]));
                    }
                }
                var uLocalWin = parseInt(uPred.sets.split("-")[0]) > parseInt(uPred.sets.split("-")[1]);
                var uDiff = parseInt(uPred.puntos) || 0;
                if(uPred.signo === "En contra") uDiff = -uDiff;

                var esDerby = permisosGlobalesMap[pUser] && permisosGlobalesMap[pUser][partidoInfo.equipo_local] === true && permisosGlobalesMap[pUser][partidoInfo.rival] === true;
                var pS = esDerby ? ptsSets * 2 : ptsSets;
                var pG = esDerby ? ptsGanador * 2 : ptsGanador;
                var pDE = esDerby ? ptsDiffExacta * 2 : ptsDiffExacta;
                var maxDist = esDerby ? maxDistancia : maxDistancia;
                
                var ptsGanados = 0;
                if (uLocalWin === oLocalWin) { ptsGanados += pG; }
                if (uPred.sets === oRes.sets) { ptsGanados += pS; }

                var distancia = Math.abs(oDiff - uDiff);
                if(distancia === 0) { 
                    ptsGanados += pDE; 
                } else if(maxDist > 0 && distancia < maxDist) { 
                    var porcentaje = (maxDist - distancia) / maxDist;
                    ptsGanados += Math.round(pDE * porcentaje);
                }

                for(var l=0; l<misLigas.length; l++){
                    var nombreLiga = misLigas[l];
                    var equiposEnEstaLiga = ligasMap[nombreLiga] || [];
                    if(equiposEnEstaLiga.indexOf(partidoInfo.equipo_local) !== -1) { 
                        puntosPorUsuarioYLiga[pUser][nombreLiga] += ptsGanados; 
                        var jEq = partidoInfo.jornada_eq || 1;
                        if (!statsPorUsuarioYLiga[pUser][nombreLiga].porJornada[jEq]) {
                            statsPorUsuarioYLiga[pUser][nombreLiga].porJornada[jEq] = 0;
                        }
                        statsPorUsuarioYLiga[pUser][nombreLiga].porJornada[jEq] += ptsGanados;
                    }
                }
            }
        }

        var clasificacionesFormateadas = {};
        for(var l=0; l<misLigas.length; l++){
            var nombreLiga = misLigas[l];
            var ranking = [];
            for(var i=1; i<dataLigas.length; i++){
                var u = dataLigas[i][0];
                var inLiga = false;
                for(var col=1; col<headersLigas.length; col++){
                    if(headersLigas[col] == nombreLiga && dataLigas[i][col] && dataLigas[i][col].toString().toUpperCase() === "X") { inLiga = true; break; }
                }
                if(inLiga && u) ranking.push({ jugador: u, nombre_real: mapNombresReales[u] || u, puntos: puntosPorUsuarioYLiga[u][nombreLiga] });
            }
            ranking.sort(function(a, b){ return b.puntos - a.puntos; });
            clasificacionesFormateadas[nombreLiga] = ranking;
        }


        var cartelera = [];
        var todosPartidos = [];
        var idsEnCartelera = {};
        var idsEnTodos = {};
        
        for(var i=0; i<partidos.length; i++) { 
            // We want to allow the match if they follow eqLoc OR rival.
            // But since 'permitido' is only checking eqLoc right now, we should check both explicitly here!
            var esLoc = misPermisos[partidos[i].equipo_local] === true;
            var esRiv = misPermisos[partidos[i].rival] === true;
            
            if(esLoc || esRiv) {
                var pId = partidos[i].id_partido;
                var pCopy = JSON.parse(JSON.stringify(partidos[i]));
                
                // Set the UI names properly. If they only follow the away team, make the away team local in their UI?
                // No, the UI is fine as long as they see the match.
                // The crucial part: Mark as derby if they follow BOTH teams!
                if(esLoc && esRiv) {
                    pCopy.es_derby = true;
                }
                
                if(!idsEnTodos[pId]) {
                    todosPartidos.push(pCopy);
                    idsEnTodos[pId] = pCopy;
                } else {
                    if(esLoc && esRiv) idsEnTodos[pId].es_derby = true;
                }
                
                if(pCopy.visibilidad === "MOSTRAR") {
                    if(!idsEnCartelera[pId]) {
                        cartelera.push(pCopy);
                        idsEnCartelera[pId] = pCopy;
                    } else {
                        if(esLoc && esRiv) idsEnCartelera[pId].es_derby = true;
                    }
                }
            } 
        }

                // ASOCIAR STREAMING A CADA PARTIDO
        for (var c = 0; c < cartelera.length; c++) {
            var cp = cartelera[c];
            var oRes = resultadosMap[cp.id_partido];
            cp.streaming = (oRes && oRes.streaming) ? oRes.streaming : "";
        }
        for (var c = 0; c < todosPartidos.length; c++) {
            var tp = todosPartidos[c];
            var oRes = resultadosMap[tp.id_partido];
            tp.streaming = (oRes && oRes.streaming) ? oRes.streaming : "";
        }


        var rondaAbierta = sheetAjustes.getRange("B2").getValue() || "1";
        
        var misEquiposSiguiendo = [];
        for(var eqq in misPermisos) {
            if(misPermisos[eqq] === true) misEquiposSiguiendo.push(eqq);
        }


        return ContentService.createTextOutput(JSON.stringify({ 
            "status": "success", 
            "jornada": rondaAbierta, 
            "equipos": cartelera, "todos_partidos": todosPartidos,
        "predicciones_usuario": porrasMap[usuario] || {}, 
            "ligas": misLigas,
            "todas_las_ligas": headersLigas.slice(1), 
            "clasificaciones": clasificacionesFormateadas,
            "stats_ligas": statsPorUsuarioYLiga,
            "nombre_real": miNombreReal,
            "insignias": insigniasMap,
            "mis_equipos_siguiendo": misEquiposSiguiendo,
            "equipos_totales": misEquiposTotales,
            "puntos_reales": puntosRealesTotales,
            "predicciones_totales": prediccionesTotalesMap,
            "reglas": { "sets": ptsSets, "ganador": ptsGanador, "diff_exacta": ptsDiffExacta, "max_dist": maxDistancia }
        })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "get_mis_predicciones") {
        var pData = getSafeData(sheetPorras);
        var pMap = {};
        var userLower = usuario.toLowerCase();
        for(var i=1; i<pData.length; i++) {
            var pUser = pData[i][1] ? pData[i][1].toString().trim().toLowerCase() : "";
            var pIdPart = pData[i][2] ? pData[i][2].toString().trim() : "";
            if(pUser === userLower) {
                pMap[pIdPart] = { sets: parseSheetText(pData[i][3]), puntos: pData[i][4], signo: pData[i][5] };
            }
        }
        return ContentService.createTextOutput(JSON.stringify({
            "status": "success",
            "predicciones": pMap
        })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "save") {
        var pData = getSafeData(sheetPorras);
        
        // VALIDACIÓN DE SEGURIDAD
        var matchDict = {};
        for (var m = 0; m < partidos.length; m++) {
            matchDict[partidos[m].id_partido] = partidos[m];
        }
        
        for (var idPart in params.predicciones) {
            var pMatch = matchDict[idPart];
            if (pMatch && pMatch.estado === "CERRADO") {
                return ContentService.createTextOutput(JSON.stringify({
                    "status": "error", 
                    "message": "⚠️ Seguridad: El partido " + idPart + " ya ha comenzado o está cerrado. Recarga la página."
                })).setMimeType(ContentService.MimeType.JSON);
            }
        }

        for (var i = pData.length - 1; i >= 1; i--) { if (pData[i][1] == usuario && params.predicciones[pData[i][2].toString()]) { sheetPorras.deleteRow(i + 1); } }
        for (var idPart in params.predicciones) {
            var p = params.predicciones[idPart];
            if (p.sets) { sheetPorras.appendRow([new Date(), usuario, idPart, p.sets, p.puntos, p.signo]); }
        }
        clearAllCache();
        return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "load") {
        var misPreds = porrasMap[usuario] || {};
        return ContentService.createTextOutput(JSON.stringify({"status": "success", "data": { predicciones: misPreds }})).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "get_history") {
        var miHistorial = [];
        var matchdaysMap = {};
        var idsEnHistorial = {};
        for(var i=0; i<partidos.length; i++) {
            if(idsEnHistorial[partidos[i].id_partido]) continue;
            idsEnHistorial[partidos[i].id_partido] = true;

            var p = partidos[i];
            if(!p.permitido) continue; 
            var rg = p.ronda_global;
            if(!matchdaysMap[rg]) matchdaysMap[rg] = [];
            var uPred = (porrasMap[usuario] && porrasMap[usuario][p.id_partido]) ? porrasMap[usuario][p.id_partido] : null;
            var oRes = resultadosMap[p.id_partido] || null;
            var ptsGanados = 0;
            var motivos = [];
            
            if(oRes && oRes.sets && oRes.parciales) {
                if(!uPred || !uPred.sets) {
                    motivos.push("No pronosticado");
                } else {
                    var oLocalWin = parseInt(oRes.sets.split("-")[0]) > parseInt(oRes.sets.split("-")[1]);
                    var oDiff = 0;
                    var setsParciales = oRes.parciales.split(",");
                    if (setsParciales.length === 1 && !oRes.parciales.includes("-") && !isNaN(parseInt(oRes.parciales))) {
                        oDiff = parseInt(oRes.parciales);
                    } else {
                        for(var sp=0; sp<setsParciales.length; sp++){
                            var nums = setsParciales[sp].split("-");
                            if(nums.length==2) oDiff += (parseInt(nums[0]) - parseInt(nums[1]));
                        }
                    }
                    var uLocalWin = parseInt(uPred.sets.split("-")[0]) > parseInt(uPred.sets.split("-")[1]);
                    var uDiff = parseInt(uPred.puntos) || 0;
                    if(uPred.signo === "En contra") uDiff = -uDiff;

                    var esDerby = misPermisos[p.equipo_local] === true && misPermisos[p.rival] === true;
                    var pS = esDerby ? ptsSets * 2 : ptsSets;
                    var pG = esDerby ? ptsGanador * 2 : ptsGanador;
                    var pDE = esDerby ? ptsDiffExacta * 2 : ptsDiffExacta;
                    var maxDist = esDerby ? maxDistancia : maxDistancia;

                    if(esDerby) motivos.push("🔥 DERBY (x2)");

                    if (uLocalWin === oLocalWin) { ptsGanados += pG; motivos.push("Ganador (+" + pG + ")"); }
                    if (uPred.sets === oRes.sets) { ptsGanados += pS; motivos.push("Sets exactos (+" + pS + ")"); }

                    var distancia = Math.abs(oDiff - uDiff);
                    if(distancia === 0) { 
                        ptsGanados += pDE; 
                        motivos.push("Dif. exacta (+" + pDE + ")"); 
                    } else if(maxDist > 0 && distancia < maxDist) { 
                        var porcentaje = (maxDist - distancia) / maxDist;
                        var ptsDiferencia = Math.round(pDE * porcentaje);
                        ptsGanados += ptsDiferencia;
                        motivos.push("Dif. acercada [" + distancia + "] (+" + ptsDiferencia + ")");
                    }
                    if(ptsGanados === 0) { motivos.push("Sin aciertos"); }
                }
            }

            var ligasEq = [];
            for(var ligaName in ligasMap) { if(ligasMap[ligaName].indexOf(p.equipo_local) !== -1) ligasEq.push(ligaName); }

            if(uPred || oRes || p.visibilidad === "MOSTRAR") {
                matchdaysMap[rg].push({
                    id_partido: p.id_partido, equipo_local: p.equipo_local, rival: p.rival, jornada_eq: p.jornada_eq,
                    timestamp: p.timestamp, ubicacion: p.ubicacion, estado: p.estado, visibilidad: p.visibilidad,
                    categoria: p.categoria, pabellon: p.pabellon, 
                    ligas: ligasEq, sets: uPred ? uPred.sets : "", puntos: uPred ? uPred.puntos : "", signo: uPred ? uPred.signo : "",
                    oficial_sets: oRes ? oRes.sets : "", oficial_parciales: oRes ? oRes.parciales : "", puntos_partido: ptsGanados, motivos: motivos.join(" | ")
                });
            }
        }
        for(var rG in matchdaysMap) { if(matchdaysMap[rG].length > 0) { miHistorial.push({ ronda: rG, partidos: matchdaysMap[rG] }); } }
        return ContentService.createTextOutput(JSON.stringify({"status": "success", "history": miHistorial})).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) { 
      var errStr = "";
      try { errStr = error.message || error.toString(); } catch(e) { errStr = "Error parseando la excepción"; }
      if (!errStr || errStr === "undefined") errStr = "Excepción nativa sin mensaje (posible cuota excedida).";
      return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": errStr, "raw_error": JSON.stringify(error)})).setMimeType(ContentService.MimeType.JSON); 
  }
}

function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var row = e.range.getRow();
  var col = e.range.getColumn();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ==========================================
  // 1. CAMBIO DESDE EL FORMULARIO DE LA WEB
  // ==========================================
  if (sheet.getName() === "Peticiones_Nombre") {
    if (col === 5 && row > 1) {
      var valor = e.value ? e.value.toString().toUpperCase().trim() : "";
      
      if (valor === "OK" || valor === "APROBADO") {
        var data = sheet.getRange(row, 1, 1, 5).getValues()[0];
        
        var usuarioActual = data[1] ? data[1].toString().trim() : "";
        var nuevoUsuario = data[2] ? data[2].toString().trim() : "";
        var nuevoNombre = data[3] ? data[3].toString().trim() : "";
        
        var sheetUsuarios = ss.getSheetByName("Usuarios");
        
        if (sheetUsuarios && usuarioActual) {
          var usuariosData = getSafeData(sheetUsuarios);
          var userRow = -1;
          
          for (var i = 1; i < usuariosData.length; i++) { 
              var uSheet = usuariosData[i][0] ? usuariosData[i][0].toString().trim() : "";
              if (uSheet.toLowerCase() === usuarioActual.toLowerCase()) { 
                  userRow = i + 1; 
                  break; 
              } 
          }
          
          if (userRow !== -1) {
            if (nuevoNombre) { 
                sheetUsuarios.getRange(userRow, 3).setValue(nuevoNombre); 
            }
            
            if (nuevoUsuario && nuevoUsuario.toLowerCase() !== usuarioActual.toLowerCase()) {
              sheetUsuarios.getRange(userRow, 1).setValue(nuevoUsuario);
              
              var sheetsColA = ["Permisos_Equipos", "Ligas", "Insignias", "Permisos_Secreta"]; 
              for (var s = 0; s < sheetsColA.length; s++) {
                var sh = ss.getSheetByName(sheetsColA[s]);
                if (sh) {
                  var d = getSafeData(sh);
                  for (var r = 1; r < d.length; r++) { 
                      var celdaU = d[r][0] ? d[r][0].toString().trim() : "";
                      if (celdaU.toLowerCase() === usuarioActual.toLowerCase()) { 
                          sh.getRange(r + 1, 1).setValue(nuevoUsuario); 
                      } 
                  }
                }
              }
              
              var sheetsColB = ["Porras", "Predicciones_Secretas"];
              for (var s = 0; s < sheetsColB.length; s++) {
                var sh = ss.getSheetByName(sheetsColB[s]);
                if (sh) {
                  var d = getSafeData(sh);
                  for (var r = 1; r < d.length; r++) { 
                      var celdaU = d[r][1] ? d[r][1].toString().trim() : "";
                      if (celdaU.toLowerCase() === usuarioActual.toLowerCase()) { 
                          sh.getRange(r + 1, 2).setValue(nuevoUsuario); 
                      } 
                  }
                }
              }
            }
            
            sheet.getRange(row, 5).setValue("✅ APROBADO Y APLICADO");
            sheet.getRange(row, 5).setBackground("#d4edda"); 
            
          } else {
            sheet.getRange(row, 5).setValue("❌ ERROR: Usuario original no encontrado");
            sheet.getRange(row, 5).setBackground("#f8d7da"); 
          }
        }
      } else if (valor === "NO" || valor === "RECHAZAR") {
        sheet.getRange(row, 5).setValue("❌ RECHAZADO");
        sheet.getRange(row, 5).setBackground("#f8d7da");
      }
    }
  }
  
  // ==========================================
  // 2. CAMBIO MANUAL DIRECTAMENTE EN LA PESTAÑA 'Usuarios'
  // ==========================================
  else if (sheet.getName() === "Usuarios") {
    if (col === 1 && row > 1) {
      // SI CAMBIA UN NOMBRE EXISTENTE
      if (e.oldValue && e.value && e.oldValue !== e.value) {
        var usuarioAntiguo = e.oldValue.toString().trim();
        var usuarioNuevo = e.value.toString().trim();
        
        // CHECK FOR DUPLICATES FIRST
        var usuariosData = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
        var duplicateFound = false;
        for (var i = 1; i < usuariosData.length; i++) {
            if (i + 1 !== row && usuariosData[i][0] && usuariosData[i][0].toString().trim().toLowerCase() === usuarioNuevo.toLowerCase()) {
                duplicateFound = true;
                break;
            }
        }
        
        if (duplicateFound) {
            sheet.getRange(row, col).setValue(usuarioAntiguo); // REVERT
            ss.toast("Error: El usuario '" + usuarioNuevo + "' ya existe en la base de datos.", "Cambio Rechazado", 5);
            return;
        }
        
        // PROCEED WITH UPDATE
        var sheetsColA = ["Permisos_Equipos", "Ligas", "Insignias", "Permisos_Secreta"]; 
        for (var s = 0; s < sheetsColA.length; s++) {
          var sh = ss.getSheetByName(sheetsColA[s]);
          if (sh && sh.getLastRow() > 0) {
            var d = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
            for (var r = 1; r < d.length; r++) { 
                var celdaU = d[r][0] ? d[r][0].toString().trim() : "";
                if (celdaU.toLowerCase() === usuarioAntiguo.toLowerCase()) { 
                    sh.getRange(r + 1, 1).setValue(usuarioNuevo); 
                } 
            }
          }
        }
        
        var sheetsColB = ["Porras", "Predicciones_Secretas", "Peticiones_Nombre"];
        for (var s = 0; s < sheetsColB.length; s++) {
          var sh = ss.getSheetByName(sheetsColB[s]);
          if (sh && sh.getLastRow() > 0) {
            var d = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
            for (var r = 1; r < d.length; r++) { 
                var celdaU = d[r][1] ? d[r][1].toString().trim() : "";
                if (celdaU.toLowerCase() === usuarioAntiguo.toLowerCase()) { 
                    sh.getRange(r + 1, 2).setValue(usuarioNuevo); 
                } 
            }
          }
        }
        
        clearAllCache();
        ss.toast("Se ha actualizado el usuario en todas las pestañas.", "Actualización", 5);
      }
      // SI AÑADE UN USUARIO NUEVO DIRECTAMENTE EN LA CELDA VACÍA DEL EXCEL
      else if (!e.oldValue && e.value) {
        var usuarioNuevo = e.value.toString().trim();
        
        // CHECK FOR DUPLICATES
        var usuariosData = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
        var duplicateFound = false;
        for (var i = 1; i < usuariosData.length; i++) {
            if (i + 1 !== row && usuariosData[i][0] && usuariosData[i][0].toString().trim().toLowerCase() === usuarioNuevo.toLowerCase()) {
                duplicateFound = true; break;
            }
        }
        
        if (duplicateFound) {
            sheet.getRange(row, col).clearContent();
            ss.toast("Error: El usuario '" + usuarioNuevo + "' ya existe.", "Rechazado", 5);
            return;
        }
        
        var sheetsToAppend = ["Permisos_Equipos", "Ligas", "Insignias", "Permisos_Secreta"];
        for(var i=0; i<sheetsToAppend.length; i++) {
            var sh = ss.getSheetByName(sheetsToAppend[i]);
            if(sh) {
                // Buscamos la primera fila vacia en la columna A
                var vals = sh.getRange(1, 1, sh.getMaxRows(), 1).getValues();
                var firstEmpty = 1;
                for(var j=0; j<vals.length; j++){
                    if(!vals[j][0] || vals[j][0].toString().trim() === "") {
                        firstEmpty = j + 1;
                        break;
                    }
                }
                if(firstEmpty > sh.getMaxRows()) sh.appendRow([""]); // Just in case
                
                sh.getRange(firstEmpty, 1).setValue(usuarioNuevo);
            }
        }
        
        clearAllCache();
        ss.toast("Usuario añadido a Permisos, Ligas e Insignias.", "Nuevo Usuario", 5);
      }
    }
  }
}
 