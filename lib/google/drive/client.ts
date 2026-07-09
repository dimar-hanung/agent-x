import { Readable } from "node:stream";

import { google } from "googleapis";

import { getGoogleOAuthClient } from "@/lib/google/oauth";
import { getValidAccessToken } from "@/lib/google/token";

const GOOGLE_DOCS_MIME = "application/vnd.google-apps.document";
const GOOGLE_SHEETS_MIME = "application/vnd.google-apps.spreadsheet";
const GOOGLE_SLIDES_MIME = "application/vnd.google-apps.presentation";

async function getDriveClient(userId: string) {
  const accessToken = await getValidAccessToken(userId);

  if (!accessToken) {
    return null;
  }

  const auth = getGoogleOAuthClient();
  auth.setCredentials({ access_token: accessToken });

  return google.drive({ version: "v3", auth });
}

export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
}

export interface DriveFileContent {
  id: string;
  name: string;
  mimeType: string;
  content?: string;
  webViewLink?: string;
  unreadableReason?: string;
}

export async function searchDriveFiles(
  userId: string,
  options: {
    query?: string;
    maxResults?: number;
  } = {}
): Promise<DriveFileSummary[] | null> {
  const drive = await getDriveClient(userId);

  if (!drive) {
    return null;
  }

  const nameQuery = options.query?.trim()
    ? `name contains '${options.query.trim().replace(/'/g, "\\'")}' and trashed = false`
    : "trashed = false";

  const response = await drive.files.list({
    q: nameQuery,
    pageSize: Math.min(Math.max(options.maxResults ?? 10, 1), 25),
    fields: "files(id, name, mimeType, modifiedTime, webViewLink, size)",
    orderBy: "modifiedTime desc",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return (response.data.files ?? []).map((file) => ({
    id: file.id ?? "",
    name: file.name ?? "(Untitled)",
    mimeType: file.mimeType ?? "application/octet-stream",
    modifiedTime: file.modifiedTime ?? undefined,
    webViewLink: file.webViewLink ?? undefined,
    size: file.size ?? undefined,
  }));
}

export async function readDriveFile(
  userId: string,
  fileId: string
): Promise<DriveFileContent | null> {
  const drive = await getDriveClient(userId);

  if (!drive) {
    return null;
  }

  const meta = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, webViewLink",
    supportsAllDrives: true,
  });

  const id = meta.data.id ?? fileId;
  const name = meta.data.name ?? "(Untitled)";
  const mimeType = meta.data.mimeType ?? "application/octet-stream";
  const webViewLink = meta.data.webViewLink ?? undefined;

  if (mimeType === GOOGLE_DOCS_MIME) {
    const exported = await drive.files.export(
      { fileId, mimeType: "text/plain" },
      { responseType: "text" }
    );

    return {
      id,
      name,
      mimeType,
      webViewLink,
      content: String(exported.data).slice(0, 50000),
    };
  }

  if (mimeType === GOOGLE_SHEETS_MIME) {
    const exported = await drive.files.export(
      { fileId, mimeType: "text/csv" },
      { responseType: "text" }
    );

    return {
      id,
      name,
      mimeType,
      webViewLink,
      content: String(exported.data).slice(0, 50000),
    };
  }

  if (mimeType === GOOGLE_SLIDES_MIME) {
    const exported = await drive.files.export(
      { fileId, mimeType: "text/plain" },
      { responseType: "text" }
    );

    return {
      id,
      name,
      mimeType,
      webViewLink,
      content: String(exported.data).slice(0, 50000),
    };
  }

  if (mimeType.startsWith("text/") || mimeType === "application/json") {
    const downloaded = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "text" }
    );

    return {
      id,
      name,
      mimeType,
      webViewLink,
      content: String(downloaded.data).slice(0, 50000),
    };
  }

  return {
    id,
    name,
    mimeType,
    webViewLink,
    unreadableReason:
      "Binary or unsupported file type. Open the webViewLink in a browser.",
  };
}

export interface UploadDriveFileInput {
  name: string;
  /** UTF-8 text body. Mutually exclusive with contentBase64. */
  content?: string;
  /** Base64-encoded binary body. Mutually exclusive with content. */
  contentBase64?: string;
  /** MIME of the uploaded bytes. Defaults to text/plain for text, or octet-stream for base64. */
  mimeType?: string;
  /**
   * If set, Google converts the upload into this Google Workspace type
   * (e.g. application/vnd.google-apps.document).
   */
  convertToGoogleMime?: string;
  /** Optional parent folder id. */
  parentFolderId?: string;
}

export async function uploadDriveFile(
  userId: string,
  input: UploadDriveFileInput
): Promise<DriveFileSummary | null> {
  const drive = await getDriveClient(userId);

  if (!drive) {
    return null;
  }

  if (!input.content && !input.contentBase64) {
    throw new Error("Either content or contentBase64 is required.");
  }

  if (input.content && input.contentBase64) {
    throw new Error("Provide only one of content or contentBase64.");
  }

  const bodyBuffer = input.contentBase64
    ? Buffer.from(input.contentBase64, "base64")
    : Buffer.from(input.content ?? "", "utf8");

  const MAX_BYTES = 5 * 1024 * 1024;

  if (bodyBuffer.byteLength > MAX_BYTES) {
    throw new Error("File exceeds the 5 MB upload limit.");
  }

  const sourceMime =
    input.mimeType ??
    (input.contentBase64 ? "application/octet-stream" : "text/plain");

  const metadata: {
    name: string;
    mimeType?: string;
    parents?: string[];
  } = {
    name: input.name,
  };

  if (input.convertToGoogleMime) {
    metadata.mimeType = input.convertToGoogleMime;
  }

  if (input.parentFolderId) {
    metadata.parents = [input.parentFolderId];
  }

  const mediaBody = Readable.from(bodyBuffer);

  const response = await drive.files.create({
    requestBody: metadata,
    media: {
      mimeType: sourceMime,
      body: mediaBody,
    },
    fields: "id, name, mimeType, modifiedTime, webViewLink, size",
    supportsAllDrives: true,
  });

  return {
    id: response.data.id ?? "",
    name: response.data.name ?? input.name,
    mimeType: response.data.mimeType ?? sourceMime,
    modifiedTime: response.data.modifiedTime ?? undefined,
    webViewLink: response.data.webViewLink ?? undefined,
    size: response.data.size ?? undefined,
  };
}
