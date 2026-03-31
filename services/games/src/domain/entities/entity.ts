import { UniqueEntityId } from "./unique-entity-id";

export abstract class Entity<T> {
  private _id: UniqueEntityId;
  protected props: T;

  constructor(props: T, id?: UniqueEntityId) {
    this._id = id ?? new UniqueEntityId();
    this.props = props;
  }

  public get id() {
    return this._id;
  }
}
