import { NotFoundException as NotFoundNest } from "@nestjs/common";
import type { ErrorPayload } from "./error-payload";

export class NotFoundException extends NotFoundNest {
  constructor(objectOrError: ErrorPayload) {
    super(objectOrError, { description: "Not Found Error" });
  }
}
