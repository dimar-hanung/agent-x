import { graphFetch, graphJson } from "@/lib/microsoft/graph-fetch";

interface GraphDriveItem {
  id: string;
  name?: string;
  file?: { mimeType?: string };
  folder?: Record<string, unknown>;
  size?: number;
  lastModifiedDateTime?: string;
  webUrl?: string;
}

interface GraphDriveSearchResponse {
  value?: GraphDriveItem[];
}

export interface OneDriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
}

export interface OneDriveFileContent {
  id: string;
  name: string;
  mimeType: string;
  content?: string;
  webViewLink?: string;
  unreadableReason?: string;
}

function mapDriveItem(item: GraphDriveItem): OneDriveFileSummary {
  return {
    id: item.id,
    name: item.name ?? "(Untitled)",
    mimeType: item.file?.mimeType ?? "application/octet-stream",
    modifiedTime: item.lastModifiedDateTime ?? undefined,
    webViewLink: item.webUrl ?? undefined,
    size: item.size !== undefined ? String(item.size) : undefined,
  };
}

export async function searchOneDriveFiles(
  userId: string,
  options: {
    query?: string;
    maxResults?: number;
  } = {}
): Promise<OneDriveFileSummary[] | null> {
  const top = Math.min(Math.max(options.maxResults ?? 10, 1), 25);
  const query = options.query?.trim() || "*";
  const params = new URLSearchParams({
    q: query,
    $top: String(top),
    $select: "id,name,file,folder,size,lastModifiedDateTime,webUrl",
  });

  const data = await graphJson<GraphDriveSearchResponse>(
    userId,
    `/me/drive/root/search?${params.toString()}`
  );

  if (!data) {
    return null;
  }

  return (data.value ?? [])
    .filter((item) => item.file)
    .map(mapDriveItem);
}

export async function readOneDriveFile(
  userId: string,
  fileId: string
): Promise<OneDriveFileContent | null> {
  const meta = await graphJson<GraphDriveItem>(
    userId,
    `/me/drive/items/${encodeURIComponent(fileId)}?$select=id,name,file,webUrl`
  );

  if (!meta) {
    return null;
  }

  const id = meta.id;
  const name = meta.name ?? "(Untitled)";
  const mimeType = meta.file?.mimeType ?? "application/octet-stream";
  const webViewLink = meta.webUrl ?? undefined;

  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  ) {
    const response = await graphFetch(
      userId,
      `/me/drive/items/${encodeURIComponent(fileId)}/content`
    );

    if (!response) {
      return null;
    }

    if (!response.ok) {
      throw new Error("Failed to read OneDrive file content.");
    }

    const content = await response.text();

    return {
      id,
      name,
      mimeType,
      webViewLink,
      content: content.slice(0, 50000),
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

export interface UploadOneDriveFileInput {
  name: string;
  content?: string;
  contentBase64?: string;
  mimeType?: string;
  parentFolderId?: string;
}

export async function uploadOneDriveFile(
  userId: string,
  input: UploadOneDriveFileInput
): Promise<OneDriveFileSummary | null> {
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

  const mimeType =
    input.mimeType ??
    (input.contentBase64 ? "application/octet-stream" : "text/plain");

  const path = input.parentFolderId
    ? `/me/drive/items/${encodeURIComponent(input.parentFolderId)}:/${encodeURIComponent(input.name)}:/content`
    : `/me/drive/root:/${encodeURIComponent(input.name)}:/content`;

  const response = await graphFetch(userId, path, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
    },
    body: bodyBuffer,
  });

  if (!response) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to upload OneDrive file.");
  }

  const item = (await response.json()) as GraphDriveItem;

  return mapDriveItem(item);
}
