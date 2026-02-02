import fs from "node:fs";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { env } from "@/env";

const hasCloudinaryConfig =
  !!env.CLOUDINARY_CLOUD_NAME &&
  !!env.CLOUDINARY_API_KEY &&
  !!env.CLOUDINARY_API_SECRET;

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

const UPLOAD_DIR =
  env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads", "menus");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export async function uploadMenuImage(
  file: Buffer,
  filename: string
): Promise<string> {
  if (hasCloudinaryConfig) {
    const uploadPreset = env.CLOUDINARY_UPLOAD_PRESET;
    const result: UploadApiResponse | undefined = await new Promise(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              upload_preset: uploadPreset,
              folder: "menus",
            },
            (error, uploadResult) => {
              if (error) {
                return reject(error);
              }
              return resolve(uploadResult);
            }
          )
          .end(file);
      }
    );

    if (result?.secure_url ?? result?.url)
      return result?.secure_url ?? result?.url;
  }

  ensureUploadDir();

  const targetPath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(file, targetPath);

  const relativeBase = env.UPLOAD_PUBLIC_BASE_PATH ?? "/uploads/menus";
  const normalizedBase = relativeBase.endsWith("/")
    ? relativeBase.slice(0, -1)
    : relativeBase;

  return `${normalizedBase}/${filename}`;
}
