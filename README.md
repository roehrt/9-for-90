# 9 € Ticket 9️⃣🎫🚂

## Background

From June on Germany offers a “9 for 90” ticket, which is primarily intended to inspire more people to use public transport and offers free use of public transport for 90 days for 9 € monthly (so 27 € for all 90 days). However, while it's primarily intended for regional transport, it can also be useful for long-distance travels. In fact: you can strip of all regional traffic at the beginning and ending of the journey.

## How it works

At the moment the "algorithm" is quite simple: just strip off the beginning and ending of the journey and check if this journey is cheaper - a smarter algorithm (using some kind of gathered graphs) is planned. All the heavy-lifting is done by the great [`hafas-client`].

## Installation

As usual:
```shell
npm i @roehrt/9-for-90
```

## API example

```javascript
const { findJourneys } = require('@roehrt/9-for-90');
findJourneys('8011160', '8010224').then((data) => {
  console.log(require('util').inspect(data, {depth: null, colors: true}))
});
```

More information on how to use `findJourneys` can be found in the [`hafas-client`] docs:
[`journeys`](https://github.com/public-transport/hafas-client/blob/master/docs/journeys.md)
and `findJourneys` have the same signature and nearly the same return type and can therefore
be used interchangeably. It returns an array of `Journeys` an `earlierRef` and `laterRef` can't be used.
The only additional property that `findJourneys` return is an optional
object `trick` storing how the price saving was achieved.

```typescript
interface CheaperJourney extends Journey {
  trick?: {
    prepend: Leg[],
    append: Leg[],
    oldPrice: number,
  }
}
```
- `oldPrice` stores the unoptimized price.
- `prepend` stores all legs that need to be **prepended** to the original journey (regional trains).
- `append` stores all legs that need to be **appended** to the original journey (regional trains).

Note: it's the same API used in [`baahn`].

## Downsides

In case of delay of the regional traffic, one has then no right to compensation.

## Related

[`baahn`] - JavaScript client for finding special cheaper connections for Deutsche Bahn journeys.

[`baahn`]: https://github.com/roehrt/baahn
[`hafas-client`]: https://github.com/public-transport/hafas-client
