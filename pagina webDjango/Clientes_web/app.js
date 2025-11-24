// app.js - versión robusta y dinámica
const BASE_URL = "http://127.0.0.1:8000";
const TOKEN_URL = BASE_URL + "/api/token/";

let accessToken = null;

function setStatus(msg, isErr = false) {
    const el = document.getElementById("loginStatus");
    el.innerText = msg;
    el.style.color = isErr ? "#d32f2f" : "#2e7d32";
    console.log(msg);
}

// LOGIN PARA OBTENER TOKEN
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("Conectando...");

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
        setStatus("Completa usuario y contraseña", true);
        return;
    }

    try {
        const resp = await fetch(TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        // show details if not OK
        if (!resp.ok) {
            const txt = await resp.text().catch(()=>null);
            setStatus(`Login falló: ${resp.status} ${resp.statusText}`, true);
            console.error("Respuesta login no OK:", resp.status, resp.statusText, txt);
            return;
        }

        const data = await resp.json();
        if (data.access) {
            accessToken = data.access;
            localStorage.setItem("access", data.access);
            if (data.refresh) localStorage.setItem("refresh", data.refresh);
            setStatus("Login correcto ✔");
            console.log("Tokens:", data);
        } else {
            setStatus("No se recibió access token", true);
            console.error("Login: respuesta inesperada", data);
        }

    } catch (err) {
        setStatus("Error de conexión: revisa servidor/CORS", true);
        console.error("Error fetch /api/token/:", err);
    }
});

// UTIL - crea encabezados y tabla dinámicamente
function buildTableFromArray(arr) {
    const table = document.getElementById("tablaVisitas");
    const tbody = document.getElementById("tbodyVisitas");
    const thead = table.querySelector("thead");
    tbody.innerHTML = "";
    thead.innerHTML = "";

    if (!Array.isArray(arr) || arr.length === 0) {
        table.style.display = "none";
        return;
    }

    // usar llaves del primer objeto como columnas
    const first = arr[0];
    const cols = Object.keys(first);

    // crear header legible (capitaliza y reemplaza _ por espacio)
    const headerHtml = "<tr>" + cols.map(c => `<th>${c.replace(/_/g,' ').replace(/\b\w/g, ch=>ch.toUpperCase())}</th>`).join("") + "</tr>";
    thead.innerHTML = headerHtml;

    // crear filas
    arr.forEach(item => {
        const values = cols.map(col => {
            let v = item[col];
            if (v === null || v === undefined) return "-";
            // formatea fechas simples (si es ISO)
            if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T?\d{0,2}:?\d{0,2}/.test(v)) {
                return v.replace("T", " ").slice(0, 19);
            }
            return String(v);
        });
        const row = `<tr>${values.map(v => `<td>${v}</td>`).join("")}</tr>`;
        tbody.innerHTML += row;
    });

    table.style.display = "table";
}

// LISTAR VISITAS EN TABLA
document.getElementById("btnListar").addEventListener("click", async () => {
    // intenta recuperar token guardado en localStorage si no está en memoria
    if (!accessToken) accessToken = localStorage.getItem("access") || null;

    if (!accessToken) {
        alert("Debes iniciar sesión primero");
        return;
    }

    setStatus("Cargando visitas...");

    try {
        const resp = await fetch(BASE_URL + "/api/visitas/", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + accessToken,
                "Accept": "application/json"
            }
        });

        // si no autorizado, mostrar mensaje claro
        if (resp.status === 401 || resp.status === 403) {
            setStatus(`Acceso denegado (${resp.status}). Token inválido/expirado.`, true);
            // opcional: borrar token guardado
            // localStorage.removeItem("access");
            console.error("Respuesta no autorizada al listar visitas:", resp.status, resp.statusText);
            return;
        }

        if (!resp.ok) {
            const txt = await resp.text().catch(()=>null);
            setStatus(`Error al cargar: ${resp.status}`, true);
            console.error("Error al obtener visitas:", resp.status, resp.statusText, txt);
            return;
        }

        const visitas = await resp.json();
        // si devuelve objeto (paginación) intentar extraer results
        if (!Array.isArray(visitas) && visitas.results) {
            buildTableFromArray(visitas.results);
        } else {
            buildTableFromArray(visitas);
        }

        setStatus(`Cargadas ${Array.isArray(visitas) ? visitas.length : (visitas.results ? visitas.results.length : 0)} visitas`);
    } catch (err) {
        setStatus("Error de red: revisa servidor/CORS", true);
        console.error("Fetch visitas error:", err);
    }
});
