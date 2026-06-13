import { ConflictException as ConflictNest } from "@nestjs/common";
import type { ErrorPayload } from "./error-payload";

export class ConflictException extends ConflictNest {
  constructor(objectOrError: ErrorPayload) {
    super(objectOrError, { description: "Conflict Error" });
  }
}
