// app.js - versión robusta y dinámica
const BASE_URL = "https://backend-u2-2025-production.up.railway.app"; // SIN slash final
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

        if (!resp.ok) {
            const txt = await resp.text().catch(() => null);
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

    const first = arr[0];
    const cols = Object.keys(first);

    const headerHtml = "<tr>" + cols.map(c => `<th>${c.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())}</th>`).join("") + "</tr>";
    thead.innerHTML = headerHtml;

    arr.forEach(item => {
        const values = cols.map(col => {
            let v = item[col];
            if (v === null || v === undefined) return "-";
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

        if (resp.status === 401 || resp.status === 403) {
            setStatus(`Acceso denegado (${resp.status}). Token inválido/expirado.`, true);
            return;
        }

        if (!resp.ok) {
            const txt = await resp.text().catch(() => null);
            setStatus(`Error al cargar: ${resp.status}`, true);
            console.error("Error al obtener visitas:", resp.status, resp.statusText, txt);
            return;
        }

        const visitas = await resp.json();

        if (!Array.isArray(visitas) && visitas.results) {
            buildTableFromArray(visitas.results);
        } else {
            buildTableFromArray(visitas);
        }

        setStatus(`Cargadas visitas correctamente`);
    } catch (err) {
        setStatus("Error de red: revisa servidor/CORS", true);
        console.error("Fetch visitas error:", err);
    }
});
