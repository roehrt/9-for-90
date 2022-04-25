import createClient, {
  Journey, JourneysOptions, Leg,
} from 'hafas-client';
// @ts-ignore
import dbProfile from 'hafas-client/p/db';

const { journeys } = createClient(dbProfile, '9-euro-ticket');

/**
 * A string containing the eva code of a station.
 */
export type NineEuroStation = string;

/**
 * Storing how the price saving was achieved
 */
export interface Trick {
  origin: NineEuroStation,
  destination: NineEuroStation,
  price: number,
}

/**
 * A journey with an extra attribute `trick`
 * storing how the price saving was achieved
 */
export interface CheaperJourney extends Journey {
  trick?: Trick,
}

/**
 * Creates an identifiable string from leg of a journey.
 *
 * @param {Leg} leg - leg of journey
 * @returns {string} hash
 */
function hashLeg(leg: Leg): string {
  return `${leg.origin?.id}@${leg.plannedDeparture ?? leg.departure}>`
    + `${leg.destination?.id}@${leg.plannedArrival ?? leg.arrival}`;
}

/**
 * Creates a hash from legs of a journey.
 *
 * @param {Leg[]} legs - legs of journey
 * @returns {string} hash
 */
function hashLegs(legs: readonly Leg[]): string {
  return legs.map(hashLeg)
    .join(':');
}

const getOrigin = (legs: readonly Leg[]) => legs[0].origin?.id;
const getDestination = (legs: readonly Leg[]) => legs[legs.length - 1].destination?.id;

// see `dbProfile.products`
const regionalProducts = ['regionalExp', 'regional', 'suburban', 'bus', 'ferry', 'subway', 'tram'];
const isRegionalProduct = ({ line }: Leg) => (
  line?.product && regionalProducts.includes(line?.product)
);

async function improve(journey: Journey, opt: JourneysOptions): Promise<Trick | null> {
  const oldOrigin = getOrigin(journey.legs);
  const oldDestination = getDestination(journey.legs);

  if (oldOrigin === undefined || oldDestination === undefined) return null;

  const legs = journey.legs.slice();
  while (legs.length && isRegionalProduct(legs[0])) legs.shift();
  while (legs.length && isRegionalProduct(legs[legs.length - 1])) legs.pop();

  if (legs.length === 0) {
    return {
      origin: oldOrigin,
      destination: oldOrigin,
      price: 0,
    };
  }

  const newOrigin = getOrigin(legs);
  const newDestination = getDestination(legs);

  if (newOrigin === undefined || newDestination === undefined) return null;
  if (newOrigin === oldOrigin && newDestination === oldDestination) return null;
  if (legs[0].departure === undefined) return null;

  const hash = hashLegs(legs);

  opt.departure = new Date(legs[0].departure);
  delete opt.arrival;
  const { journeys: cheaperJourneys } = await journeys(newOrigin, newDestination, opt);
  if (cheaperJourneys === undefined) return null;

  // TODO: Just search for the cheapest one? (but: check for only regional ones!)
  const improved = cheaperJourneys.find(
    (cheaperJourney) => hash === hashLegs(cheaperJourney.legs),
  );

  if (improved?.price?.amount === undefined) return null;

  return {
    origin: newOrigin,
    destination: newDestination,
    price: improved.price?.amount,
  };
}

/**
 * Finds cheaper prices for a given journey.
 *
 * @param {NineEuroStation} from - origin of journey
 * @param {NineEuroStation} to - destination of journey
 * @param {JourneysOptions} [opt] - journey options
 * @returns {Promise<CheaperJourney[]>}
 */
// eslint-disable-next-line import/prefer-default-export
export async function findJourneys(
  from: NineEuroStation,
  to: NineEuroStation,
  opt: JourneysOptions = {},
): Promise<CheaperJourney[]> {
  const { journeys: originalJourneys } = await journeys(from, to, opt);

  if (!originalJourneys?.length) return [];

  const improveWithOpt = (journey: Journey) => improve(journey, opt);
  const improvedJourneys = await Promise.allSettled(originalJourneys.map(improveWithOpt));

  return improvedJourneys.map((promise, idx) => {
    const originalJourney = originalJourneys[idx];
    if (promise.status === 'rejected' || promise.value === null) return originalJourney;
    return {
      ...originalJourney,
      trick: promise.value,
    };
  });
}
