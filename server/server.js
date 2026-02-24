import express from "express";
import { google } from "googleapis";
import { Resend } from "resend";
import { readFileSync } from "fs";

const GUIDES = [
  { path: "./guides/chipre-vs-andorra-2026.pdf", filename: "Chipre vs Andorra 2026 - Análisis Fiscal.pdf" },
  { path: "./guides/guia-reubicacion-chipre.pdf", filename: "Guía de Reubicación a Chipre.pdf" },
];

const app = express();
app.use(express.json());

app.post("/submit", async (req, res) => {
  const { nombre, email, telefono, ingresos } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email requerido" });
  }

  // 1. Save to Google Sheets
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[nombre, email, telefono, ingresos, new Date().toISOString()]],
    },
  });

  // 2. Send email with guides
  const resend = new Resend(process.env.RESEND_API_KEY);

  const attachments = GUIDES.map(({ path, filename }) => ({
    filename,
    content: readFileSync(path),
  }));

  await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: "Tus 2 guías gratuitas: Chipre vs Andorra 2026",
    html: `<p>Hola ${nombre},</p>
<p>Aquí tienes los 2 documentos que solicitaste:</p>
<ul>
  <li><strong>Análisis fiscal Chipre vs Andorra 2026</strong> — comparativa completa con todos los desgloses</li>
  <li><strong>Guía de reubicación a Chipre</strong> — todo el proceso paso a paso</li>
</ul>
<p>Si tienes alguna duda, responde a este email.</p>`,
    attachments,
  });

  res.json({ success: true, message: "Datos recibidos correctamente" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
