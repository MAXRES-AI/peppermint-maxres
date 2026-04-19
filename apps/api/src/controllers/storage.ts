import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import multer from "fastify-multer";
import path from "path";
import { prisma } from "../prisma";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIME_TYPES.has(file.mimetype));
  },
});

interface TicketParams {
  id: string;
}

interface UploadBody {
  user: string;
}

export function objectStoreRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/api/v1/storage/ticket/:id/upload/single",
    { preHandler: upload.single("file") },
    async (
      request: FastifyRequest<{ Params: TicketParams; Body: UploadBody }>,
      reply: FastifyReply
    ) => {
      if (!request.file) {
        return reply.code(400).send({
          message: "No file uploaded or file type not allowed",
          success: false,
        });
      }

      const uploadedFile = await prisma.ticketFile.create({
        data: {
          ticketId: request.params.id,
          filename: path.basename(request.file.originalname),
          path: request.file.path,
          mime: request.file.mimetype,
          size: request.file.size,
          encoding: request.file.encoding,
          userId: request.body.user,
        },
      });

      reply.send({
        success: true,
        id: uploadedFile.id,
      });
    }
  );

  // Get all ticket attachments

  // Delete an attachment

  // Download an attachment
}
