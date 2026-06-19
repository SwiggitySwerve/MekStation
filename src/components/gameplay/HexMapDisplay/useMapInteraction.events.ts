/**
 * Structural subset shared by React synthetic and native wheel events.
 * The handlers only touch these members, so accepting the subset lets
 * the same callback serve the JSX prop AND the non-passive native
 * listener without unsafe casts.
 */
export interface IWheelEventLike {
  preventDefault(): void;
  readonly deltaY: number;
  readonly clientX: number;
  readonly clientY: number;
}

/** Structural touch point - see `IWheelEventLike` for the rationale. */
export interface ITouchPointLike {
  readonly clientX: number;
  readonly clientY: number;
}

/** Structural subset shared by React synthetic and native touch events. */
export interface ITouchEventLike {
  preventDefault(): void;
  readonly touches: ArrayLike<ITouchPointLike>;
}
