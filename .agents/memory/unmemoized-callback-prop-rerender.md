---
name: Unmemoized callback prop causes infinite refresh loops
description: A prop function like `flash`/`onSave` recreated every render breaks memoized child useEffect([load]) dependencies, causing repeated silent refetches that look like "the page keeps refreshing itself".
---

Symptom: a page/tab appears to auto-refresh repeatedly with no user action, but no interval/polling code exists.

Root cause pattern: a parent component defines a callback (e.g. `function flash(...) {...}`) as a plain function (not `useCallback`), then passes it as a prop to a child. If the child memoizes its data-loading function via `useCallback(load, [flash])` and calls it from `useEffect(() => { load() }, [load])`, then every parent re-render creates a new `flash` reference → new `load` reference → effect re-fires → refetch → state update → re-render → repeat.

**Why:** React `useCallback`/`useEffect` dependency arrays compare by reference. Any prop threaded into a memoized dependency chain must itself be stable across renders, or the memoization is silently defeated.

**How to apply:** When a child's data-fetch `useEffect` depends on a callback prop (flash, onSuccess, onSave, etc.), verify the parent wraps that callback in `useCallback` with a stable/empty dependency array. This is a good default hygiene rule for any top-level "flash message" / toast helper that gets passed down through many components.
