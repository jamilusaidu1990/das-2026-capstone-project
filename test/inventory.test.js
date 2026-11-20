import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createStore,
  createEvent,
  addTier,
  publishEvent,
  unpublishEvent,
  bookTickets,
  cancelBooking,
  joinWaitlist,
  offerNextOnWaitlist,
  findBookingByReference,
  seatsLeft,
  listEventSummaries,
} from "../src/domain/inventory.js";
import { DomainError } from "../src/domain/errors.js";

const throwsCode = (fn, code) =>
  assert.throws(
    fn,
    (error) => error instanceof DomainError && error.code === code,
  );

describe("inventory", () => {
  let store;
  let event;
  let tier;

  beforeEach(() => {
    store = createStore();
    event = createEvent(store, {
      title: "Test Event",
      city: "Lagos",
      startsAt: "2026-12-05T17:00:00Z",
      organizerId: "org-1",
    });
    tier = addTier(store, event.id, {
      name: "General",
      priceCents: 2500,
      capacity: 3,
    });
  });

  describe("creating events and tiers", () => {
    it("starts events as drafts", () => {
      assert.equal(event.status, "draft");
    });

    it("creates events with a new id and hides drafts from the public list", () => {
      const anotherEvent = createEvent(store, {
        title: "Abuja Tech Meetup",
        city: "Abuja",
        venue: "Conference Hall",
        startsAt: "2026-12-10T17:00:00Z",
      });

      assert.ok(anotherEvent.id);
      assert.notEqual(anotherEvent.id, event.id);
      assert.equal(anotherEvent.status, "draft");
      assert.equal(listEventSummaries(store).length, 0);
    });

    it("rejects missing city and impossible dates without saving an event", () => {
      const initialCount = store.events.size;

      throwsCode(
        () =>
          createEvent(store, {
            title: "Missing City Event",
            city: " ",
            startsAt: "2026-12-05T17:00:00Z",
          }),
        "VALIDATION",
      );

      throwsCode(
        () =>
          createEvent(store, {
            title: "Impossible Date Event",
            city: "Lagos",
            startsAt: "2026-02-30",
          }),
        "VALIDATION",
      );

      assert.equal(store.events.size, initialCount);
    });

    it("rejects a missing title, a bad date and bad numbers", () => {
      throwsCode(
        () =>
          createEvent(store, { title: " ", city: "x", startsAt: "2026-12-05" }),
        "VALIDATION",
      );
      throwsCode(
        () => createEvent(store, { title: "x", city: "x", startsAt: "nope" }),
        "VALIDATION",
      );
      throwsCode(
        () =>
          addTier(store, event.id, {
            name: "x",
            priceCents: 19.99,
            capacity: 5,
          }),
        "VALIDATION",
      );
      throwsCode(
        () =>
          addTier(store, event.id, { name: "x", priceCents: 100, capacity: 0 }),
        "VALIDATION",
      );
    });

    it("creates a ticket tier with zero sold and the correct available seats", () => {
      const newTier = addTier(store, event.id, {
        name: "VIP",
        priceCents: 500000,
        capacity: 100,
      });

      assert.equal(newTier.sold, 0);
      assert.equal(seatsLeft(newTier), 100);
      assert.equal(newTier.priceCents, 500000);
    });

    it("rejects adding a tier to an event that does not exist", () => {
      throwsCode(
        () =>
          addTier(store, "missing-event-id", {
            name: "General",
            priceCents: 500000,
            capacity: 100,
          }),
        "NOT_FOUND",
      );
    });

    it("cannot publish an event with no tiers", () => {
      const empty = createEvent(store, {
        title: "Empty",
        city: "Abuja",
        startsAt: "2026-12-06",
      });
      throwsCode(() => publishEvent(store, empty.id), "INVALID_STATE");
      const published = publishEvent(store, event.id);

      assert.equal(published.status, "published");
      assert.equal(listEventSummaries(store).length, 1);
      assert.equal(listEventSummaries(store)[0].id, event.id);
    });
    it("can unpublish an event", () => {
      publishEvent(store, event.id);

      const unpublished = unpublishEvent(store, event.id);

      assert.equal(unpublished.status, "draft");
      assert.equal(listEventSummaries(store).length, 0);
    });
  });

  describe("booking", () => {
    it("reduces the seats left and prices in whole cents", () => {
      publishEvent(store, event.id);

      const booking = bookTickets(store, tier.id, "ada", 2);
      assert.equal(booking.amountCents, 5000);
      assert.equal(booking.status, "pending");
      assert.equal(seatsLeft(tier), 1);
    });

    it("rejects a booking bigger than the seats left, and changes nothing", () => {
      publishEvent(store, event.id);
      bookTickets(store, tier.id, "ada", 2);
      const bookingsBefore = store.bookings.size;

      throwsCode(() => bookTickets(store, tier.id, "bayo", 2), "SOLD_OUT");

      assert.equal(seatsLeft(tier), 1);
      assert.equal(store.bookings.size, bookingsBefore);
    });

    it("lets the last ticket be booked, then reports sold out", () => {
      bookTickets(store, tier.id, "ada", 3);
      assert.equal(seatsLeft(tier), 0);
      throwsCode(() => bookTickets(store, tier.id, "bayo", 1), "SOLD_OUT");
    });

    it("validates the quantity", () => {
      for (const bad of [0, -1, 1.5, 11, "2", undefined]) {
        throwsCode(() => bookTickets(store, tier.id, "ada", bad), "VALIDATION");
      }
    });

    it("finds a booking by its reference code", () => {
      const booking = bookTickets(store, tier.id, "ada", 1);
      assert.match(booking.reference, /^[A-Z2-9]{8}$/);
      assert.equal(findBookingByReference(store, booking.reference), booking);
      assert.equal(findBookingByReference(store, "NOPE0000"), undefined);
    });
  });

  describe("cancelling", () => {
    it("gives the seats back", () => {
      const booking = bookTickets(store, tier.id, "ada", 2);
      cancelBooking(store, booking.reference);
      assert.equal(seatsLeft(tier), 3);
      assert.equal(booking.status, "cancelled");
    });

    it("cannot be done twice (seats are released once)", () => {
      const booking = bookTickets(store, tier.id, "ada", 2);
      cancelBooking(store, booking.reference);
      throwsCode(
        () => cancelBooking(store, booking.reference),
        "INVALID_STATE",
      );
      assert.equal(seatsLeft(tier), 3);
    });
  });

  describe("waitlist", () => {
    it("only opens when the tier cannot satisfy the request", () => {
      throwsCode(() => joinWaitlist(store, tier.id, "ada", 1), "NOT_SOLD_OUT");
      bookTickets(store, tier.id, "bayo", 3);
      assert.deepEqual(joinWaitlist(store, tier.id, "ada", 1), { position: 1 });
      assert.deepEqual(joinWaitlist(store, tier.id, "chidi", 1), {
        position: 2,
      });
    });

    it("offers seats first come, first served", () => {
      const booking = bookTickets(store, tier.id, "bayo", 3);
      joinWaitlist(store, tier.id, "ada", 1);
      joinWaitlist(store, tier.id, "chidi", 1);
      assert.equal(
        offerNextOnWaitlist(store, tier.id),
        undefined,
        "no seats yet",
      );
      cancelBooking(store, booking.reference);
      assert.equal(offerNextOnWaitlist(store, tier.id).userId, "ada");
      assert.equal(offerNextOnWaitlist(store, tier.id).userId, "chidi");
    });
  });
});
