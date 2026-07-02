---
title: "Try-catch; The GOTO that Needs to GOAWAY"
seoTitle: "Try-catch and JavaScript Error Handling | Go-Inspired Patterns"
description: "Rethinking JavaScript error handling with Go-inspired error-first patterns for cleaner, safer, and more readable TypeScript code."
pubDate: 2025-04-14
updatedDate: 2025-12-22
draft: false
hero: "/og/try-catch-error-handling.png"
---

_"Do I wrap my very specific code with a try-catch and move the variable creation outside the scope, or do I just keep expanding the catch scope as I go?"_

We’ve all been there, balancing clean, readable code with the messy reality of error handling. On one hand, we want to avoid cluttering our logic with boilerplate. On the other, we don't want to deal with awkward scoping issues or argue with the linter about whether a variable exists.
So, what’s the “right” answer? Well... there sort of is one. But it’s not found in JavaScript (duh'). Or C#.

It’s found in Go.

But how does a language remove the need for something as deeply embedded in frontend and backend development as try-catch?

If you ask me, try-catch is like the plague. It’s essentially a glorified GOTO statement, just dressed up in structured programming syntax. For you who aren't as nerdy; GOTO statements are a programmatic way to perform a one-way jump to either a specified named label or line of code, skipping anything in between. When an error is thrown, execution jumps—often unpredictably—to a separate block of code, potentially far removed from the scope in which the error occurred. This makes following the logical flow of a program harder, and managing side effects even trickier.

When I first encountered try-catch, coming from a background in batch scripting—where GOTO was king—it seemed like a programming savior. It caught errors! It let me ignore them! It gave me the illusion of control. But eventually, I realized that it was adding cognitive load and making my code harder to follow. Sure, it may avoid full-page crashes—but at a cost.

Here are two examples of the different approaches I mentioned. Either you have an ever-growing scope:

```typescript
try {
  const userData = await api.getUserData();

  const organizationData = await api.getOrganizationData(userData.organizationId);

  return { userData, organizationData };
} catch (e) {
  // Handle multiple errors
}
```

Or where variables "escape" the scope of the try-catch:

```typescript
let userData: UserData | null = null;
let organizationData: OrganizationData | null = null;
try {
  userData = await api.getUserData();
} catch (e) {
  // Handle/rethrow/rewrap error
}

if (!userData) {
  // Potential further error-throwing due to missing data
}

try {
  organizationData = await api.getOrganizationData(userData.organizationId);
} catch (e) {
  // Handle/rethrow/rewrap error
}

if (!organizationData) {
  // Potential further error-throwing due to missing data
}

return { userData, organizationData };
```

Languages like C# have tried to improve things with features like type-conditional catches, but ultimately, the same issues persist: the more logic you put in a `try` block, the more your `catch` turns into a cluttered mess of conditionals. And if you keep try scopes tight, you often find yourself battling linters or ending up with excessive optional chaining. 

## Go’s Simple, Elegant Approach

For readers who haven’t had the pleasure of writing Go yet—strap in. Go makes you think about errors in every function. Always. In theory, a Go program shouldn’t have runtime exceptions in the traditional sense. The pattern is simple: a function returns either a result and `nil` for the error, or `nil` for the result and a real error. You should never get both, it's a binary of either/or.

Here’s a basic, simplified example:

```go
u, err := getUserData(userID)
if err != nil {
    return fmt.Errorf("error getting user in get user handler: %w", err)
}

err = sendUserNextSimulation(u)
if err != nil {
    return fmt.Errorf("error sending simulation to user in handler: %w", err)
}

return nil
```

This mutual exclusivity keeps things clean. If you receive an error, there is no result—and vice versa. You handle it immediately, right there, while the context is still fresh in your head. No jumping. No surprises. No GOTO.

To adopt this in JavaScript, a few tweaks need to be made. The pattern flips the position of the values to emphasize handling the error first. With this change, having to handle the error is almost unavoidable, and if you do, it is such a verbose cause of action that you can't avoid the inevitable "oh right, that's my fault" when your code crashes.

So, let's refactor the two examples from earlier, both using try-catch in different ways:

```typescript
const [errUser, userData] = await httpClient.get('/users/{userId}', { userId });
if (errUser) {
  return [new Error('error getting user-data in loader', { cause: errUser }), null];
}

const [errOrganization, organizationData] = await httpClient.get('/organizations/{organizationId}', {
  organizationId: userData.organizationId,
});
if (errOrganization) {
  return [new Error('error getting organization-data in loader', { cause: errOrganization }), null];
}

return [null, { userData, organizationData }];
```

The resulting code might have a higher line count, but ultimately we end up with code that’s clearer, more concise, and easier to debug. You get a direct 1:1 relationship between error and handling. You don’t need to worry about try-catch scopes or jump between lines to understand the full picture.

## Wrapping and Extending

To fully achieve this, both a synchronous and asynchronous simple wrapper that "converts" thrown exceptions into the preferred return-type. This opens up a more consistent error-handling model across the board—without rewriting every package or SDK we interact with.

Here’s the simple wrappers in question, including type-definitions:

```typescript
// wrap.ts

/** Tuple-based result used throughout the client, `[error, data]`. */
export type SafeWrap<ErrorType = Error, DataType = unknown> =
  | [error: ErrorType, data: null]
  | [error: null, data: DataType];

/** Async variant of {@link SafeWrap}. */
export type SafeWrapAsync<ErrorType = Error, DataType = unknown> = Promise<SafeWrap<ErrorType, DataType>>;

/**
 * Gracefully handles a given Promise factory.
 * @example
 * const [error, data] = await safeWrapAsync(() => asyncAction());
 */
export async function safeWrapAsync<ErrorType = Error, DataType = unknown>(
  promise: () => Promise<DataType>,
): SafeWrapAsync<ErrorType, DataType> {
  try {
    const data = await promise();
    return [null, data];
  } catch (error) {
    return [error as ErrorType, null];
  }
}

/** Wrap a synchronous function in a tuple-style result. */
export function safeWrap<ErrorType = Error, DataType = unknown>(fn: () => DataType): SafeWrap<ErrorType, DataType> {
  try {
    const data = fn();
    return [null, data];
  } catch (error) {
    return [error as ErrorType, null];
  }
}

```

As demonstrated, try-catch is still a "necessary evil"—but we can abstract it away, so that any consumer (internal or external) stays clear and readable:

```typescript
const [err, file] = await safeWrapAsync(() => storageClient.get('/file-reference'));
if (err) {
  return [new Error('error getting file-reference from storageClient', { cause: err }), null];
}

return [null, file];
```

Or equally simple with synchronous, "dangerous" calls:

```typescript
const [err, parsed] = safeWrap(() => JSON.parse(potentiallyBadData));
if(err) {
  return [new Error('error parsing JSON', { cause: err }), null];
}

return [null, parsed];
```

The result? Safer, clearer, and more debuggable code. We’re not skipping error handling anymore—we’re required to confront it as it arrives.
Of course, try-catch still exists with these changes, but the scope is narrowed. There’s no way to fully eliminate it, especially when integrating with external code and packages. But with this, it can be abstracted away, reducing its surface area, and let developers write cleaner, more focused logic.

Objectively? This is just a better way to handle errors. Cleaner, more readable, and without the ancient baggage of jumping from one part of your logic to another.
It’s time for try-catch—the modern GOTO—to finally GOAWAY.

Even if this is a somewhat optimistic interpretation of Dijkstra’s famous words, I like to think he'd agree:

> _“The quality of programmers is determined by the quality of their control structures.”_

You made it this far, so maybe we’ve won one more developer over to a better way of handling errors in JavaScript—and maybe even in programming as a whole.
