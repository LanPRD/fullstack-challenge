import { BadRequestException as BadRequestNest } from "@nestjs/common";
import type { ErrorPayload } from "./error-payload";

export class BadRequestException extends BadRequestNest {
  constructor(objectOrError: ErrorPayload) {
    super(objectOrError, { description: "Bad Request Error" });
  }
}
