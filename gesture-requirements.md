# Gesture Recognition Requirements

This document outlines the requirements for a TypeScript class designed to recognize and differentiate various gestures from both computer mouse and mobile touch events within a browser web application.

## Class Structure and Core Functionality

The class, let's call it `GestureRecognizer`, must adhere to the following:

*   **Constructor**: Accept an HTML element as a parameter. All gesture inputs will be monitored on this element.
*   **`destroy()` method**: Implement a `destroy()` method responsible for detaching all gesture event listeners from the HTML element provided in the constructor, preventing memory leaks.
*   **Public RxJS Observables**: Provide public RxJS `Observable`s for each recognized gesture. These observables will emit an event when the corresponding gesture is detected.
*   **Configuration**: All gesture-specific thresholds (durations, distances) must be configurable via an optional configuration object passed to the constructor, allowing for customization. Sensible default values should be used if not provided.

## Recognized Gestures

The `GestureRecognizer` class must accurately recognize and differentiate the following gestures:

### 1. `touchStart`

*   **Description**: This event is not a gesture in itself but serves as an immediate feedback mechanism.
*   **Trigger**: Fires as soon as the monitored HTML element is first touched (mobile) or a mouse button is pressed down (desktop), regardless of what subsequent gesture actually occurs.
*   **Output**: An RxJS `Observable` that emits when `touchStart` is detected.

### 2. `allGesturesComplete`

*   **Description**: This event signifies the completion of a gesture recognition cycle.
*   **Trigger**: Fires when one of the following conditions is met:
    *   A specific gesture (e.g., `swipeUp`, `tap`, `longPress`) has been successfully detected and emitted.
    *   It has been determined that no recognized gesture will occur. This determination should be made by the class based on the configured time periods for other gestures (e.g., if the maximum duration for a tap has passed without a tap being recognized, and no other gesture criteria are met).
*   **Output**: An RxJS `Observable` that emits when `allGesturesComplete` is detected.

### 3. `swipeUp` / `swipeDown`

*   **Description**: A quick, directional movement.
*   **Trigger**: Detected when a touch/mouse moves a significant distance in the specified direction within a short period.
*   **Configuration Parameters (with sensible defaults)**:
    *   `minSwipeDistance`: The minimum distance (in pixels) the touch/mouse must travel to be considered a swipe.
        *   **Default**: `50` pixels.
    *   `maxSwipeDuration`: The maximum duration (in milliseconds) for the movement to be considered "quick".
        *   **Default**: `300` milliseconds.
*   **Output**: Separate RxJS `Observable`s for `swipeUp` and `swipeDown` that emit when detected.

### 4. `tap`

*   **Description**: A single, brief touch or click.
*   **Trigger**: Detected when a touch/mouse button is pressed and released quickly, with minimal movement. It must be ensured that this event does not fire if the input was part of another gesture (e.g., a swipe, double tap, or long press).
*   **Configuration Parameters (with sensible defaults)**:
    *   `maxTapDuration`: The maximum duration (in milliseconds) a touch/mouse can be held down to be considered a tap.
        *   **Default**: `200` milliseconds.
    *   `maxTapMovement`: The maximum allowed movement (in pixels) during a tap gesture.
        *   **Default**: `10` pixels.
*   **Output**: An RxJS `Observable` that emits when a `tap` is detected.

### 5. `doubleTap`

*   **Description**: Two consecutive `tap` gestures within a short timeframe.
*   **Trigger**: Detected when two `tap` events occur in close succession, both spatially and temporally.
*   **Configuration Parameters (with sensible defaults)**:
    *   `maxDoubleTapInterval`: The maximum time (in milliseconds) allowed between the end of the first tap and the start of the second tap.
        *   **Default**: `300` milliseconds.
    *   `maxDoubleTapDistance`: The maximum allowed distance (in pixels) between the start points of the two taps.
        *   **Default**: `20` pixels.
*   **Output**: An RxJS `Observable` that emits when a `doubleTap` is detected.

### 6. `longPress`

*   **Description**: Holding down a touch or mouse button for an extended period.
*   **Trigger**: Fires after the user touches/clicks and continuously holds for a specified minimum duration, with minimal movement. Crucially, no other gesture events (like `tap` or `swipe`) should fire when the user eventually lifts their finger/releases the mouse button after a `longPress` has been recognized.
*   **Configuration Parameters (with sensible defaults)**:
    *   `minLongPressDuration`: The minimum duration (in milliseconds) a touch/mouse must be held down to trigger a long press.
        *   **Default**: `500` milliseconds.
    *   `maxLongPressMovement`: The maximum allowed movement (in pixels) during a long press gesture.
        *   **Default**: `15` pixels.
*   **Output**: An RxJS `Observable` that emits when a `longPress` is detected.