import { InternalServerErrorException as InternalNest } from "@nestjs/common";
import type { ErrorPayload } from "./error-payload";

export class InternalException extends InternalNest {
  constructor(objectOrError: ErrorPayload) {
    super(objectOrError, { description: "Internal Server Error" });
  }
}
