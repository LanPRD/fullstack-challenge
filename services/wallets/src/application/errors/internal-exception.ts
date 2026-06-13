import { InternalServerErrorException } from "@nestjs/common";
import type { ErrorPayload } from "./error-payload";

export class InternalException extends InternalServerErrorException {
  constructor(objectOrError: ErrorPayload) {
    super(objectOrError, { description: "Internal Server Error" });
  }
}
