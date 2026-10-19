# TicketHub: Ticketing System Design

## 1. Requirements

### Functional requirements

- Visitors can browse and search concerts and events, and view event details and seat maps.
- Registered users can select seats, temporarily hold them, complete payment, and view their tickets.
- Users can see whether seats are available, held, or sold. A hold has a visible expiration time.
- The system sends a clear result when a seat is no longer available or a hold expires.
- Sale rules are applied consistently: sales open at the announced time, users enter through a waiting room, and purchase limits are enforced.
- Users can view their own orders and tickets, but cannot access another user's purchases.

### Non-functional requirements

- **Correctness:** A seat can belong to no more than one active hold or completed order. Payment and ticket issuance must be idempotent so retries cannot create duplicate charges or tickets.
- **Speed:** Cached event pages should load quickly. Seat maps should show recent availability, and hold requests should return promptly with a confirmed result or a clear rejection.
- **Fairness:** For high-demand sales, a virtual waiting room admits users in a controlled, time-stamped order. Per-user purchase limits and bot/rate protections apply equally; the queue position is not a guarantee of a seat.
- **Availability and durability:** Browsing should remain available during a sale surge. Confirmed orders and payments must be stored durably; if the authoritative inventory cannot be checked, the system must not claim a seat is reserved.
- **Security:** Require authentication to hold seats or pay, authorize access to orders, validate requests, and protect payment details by using a payment provider rather than storing card data.
- **Scalability:** The read-heavy browsing path and bursty purchase path must scale independently, without allowing caches or replicas to decide whether a seat is actually available.

## 2. Traffic estimates

Assume 86,400 seconds in a day. The normal-day averages spread activity evenly across 24 hours; real traffic will have higher peaks.

| Measure | Calculation | Estimate |
| --- | --- | --- |
| Registered users | Given | 2,000,000 |
| Normal page views | 50,000 visitors/day × 10 pages | 500,000 page views/day |
| Normal page-view rate | 500,000 ÷ 86,400 | About 5.8 page views/second on average |
| Normal tickets sold | Given | 5,000 tickets/day |
| Normal ticket-sale rate | 5,000 ÷ 86,400 | About 0.058 tickets/second, or 1 every 17 seconds on average |
| Popular-sale purchase attempts | 200,000 people ÷ 600 seconds | About 333 people/second over the first 10 minutes |
| Popular-sale capacity | Given | 20,000 seats |
| Demand versus supply | 200,000 people ÷ 20,000 seats | 10 people competing per seat; at most 10% can get one seat if each gets one |

The popular-sale attempt rate is about **57 times the normal average page-view rate** (333 ÷ 5.8), though these are different kinds of requests and not a direct workload comparison. Compared with the normal average ticket-sale rate, it is about **5,760 times higher** (333 ÷ 0.058). The sale figure is an average across ten minutes, not a safe instantaneous peak: many users may arrive at once. Capacity planning should therefore include headroom above 333 attempts/second and use a waiting room to smooth the burst. The stated 2 million registered users are not assumed to be simultaneously active.

## 3. API

All endpoints are under `/api/v1`. Requests and responses use JSON. Authenticated endpoints require a user session or bearer token. IDs are opaque. Writes accept an `Idempotency-Key` so client retries do not repeat an operation.

| Method and path | Purpose | Typical success |
| --- | --- | --- |
| `GET /events?query=&date=&cursor=` | Search and browse published events; paginated results include event summaries. | `200 OK` |
| `GET /events/{eventId}` | Read event details, venue, sale status, and seat-map reference. | `200 OK` |
| `GET /events/{eventId}/seats` | Read a seat map and best-effort availability snapshot. This is informational, not a reservation. | `200 OK` |
| `POST /events/{eventId}/holds` | Authenticated request to hold one or more seat IDs. Body: `{"seatIds":["s101","s102"]}`. Returns the hold/order ID and `expiresAt`. | `201 Created` |
| `POST /orders/{orderId}/payment` | Pay for a valid hold through the payment provider. Body contains a provider payment token, not raw card details. | `200 OK` |
| `GET /me/tickets?cursor=` | List the signed-in user's confirmed tickets and order details. | `200 OK` |
| `GET /me/orders/{orderId}` | Read one of the signed-in user's orders, including pending/expired status. | `200 OK` |

Return `401 Unauthorized` for missing authentication, `403 Forbidden` for an action the user is not allowed to take, `404 Not Found` for unknown resources, `409 Conflict` when a requested seat is unavailable or the hold has expired, and `422 Unprocessable Entity` for invalid seat selections or purchase limits. The hold endpoint must report the exact seats it held; it must never return success based only on the seat-map snapshot.

## 4. Data model

Use a relational database for transactional inventory and enforce relationships with foreign keys.

| Table | Important columns and constraints |
| --- | --- |
| `users` | `id` primary key, `email` unique and required, `created_at` |
| `events` | `id` primary key, `name`, `venue`, `starts_at`, `sale_opens_at`, `status` |
| `seats` | `id` primary key, `event_id` foreign key to `events`, `seat_label`, `status` (`available`, `held`, `sold`), `hold_order_id` nullable foreign key to `orders`, `hold_expires_at`; unique (`event_id`, `seat_label`) |
| `orders` | `id` primary key, `user_id` foreign key to `users`, `event_id` foreign key to `events`, `status` (`pending`, `paid`, `expired`, `cancelled`), `hold_expires_at`, `payment_reference` unique when present, `created_at` |
| `order_items` | `order_id` foreign key to `orders`, `seat_id` foreign key to `seats`, `price`; primary key (`order_id`, `seat_id`) |

Relationships:

- One user can have many orders; each order belongs to one user.
- One event has many seats and many orders; each seat and order belongs to one event.
- An order has one or more order items, and each order item refers to one seat. The `order_items` table records which seats a purchase contains.
- The `seats` inventory row is the authoritative current state. `hold_order_id` identifies the order holding a seat; when payment succeeds, the seat becomes `sold` and remains associated with its owning order. Database constraints or a trigger should ensure a held/sold seat has an owning order and that its order is for the same event.

## 5. Architecture and double-booking prevention

```text
 Visitors
    |
    v
 [CDN / WAF] -- cached event pages and static seat maps
    |
    v
 [Load balancer] ---> [Virtual waiting room / rate limiter]
                              |
                    admitted, signed requests
                              v
                       [Stateless API servers]
                        /       |        \
                       /        |         \--> [Payment provider]
                      v         v                    |
             [Cache / read     [Relational DB] <-----+
                replicas]     primary: orders,
                browsing      seats, transactions
                                   |
                            [Expiry worker]
                            releases expired holds
```

### Components and sale behavior

- **CDN / WAF:** Serves cacheable event descriptions and static assets near users, and filters abusive traffic. It does not cache authoritative seat ownership.
- **Load balancer:** Spreads admitted requests over stateless API servers and removes unhealthy instances.
- **Virtual waiting room / rate limiter:** Assigns a fair queue position under a published policy and admits traffic at a controlled rate. Signed admission tokens prevent users from bypassing the queue; limits apply per account and sale.
- **Stateless API servers:** Authenticate and authorize users, validate requests, and implement event, hold, payment, and ticket operations. They can scale horizontally.
- **Cache / read replicas:** Handle high-volume browsing and seat-map snapshots. Their data may lag, so the hold operation always checks and changes inventory on the database primary.
- **Relational database primary:** Keeps orders and seat inventory durable and is the single authority for reservations. Transactions, row locks, conditional updates, foreign keys, and uniqueness constraints protect correctness.
- **Payment provider:** Processes card details outside TicketHub. Payment requests use the order ID as an idempotency key; the provider's result is verified before an order is marked paid.
- **Expiry worker:** Finds timed-out pending holds and releases their seats in a transaction. It can retry safely; the database checks the current order and seat status before changing anything.

### How two people cannot buy the same seat

The seat map is only a snapshot, so two users may both see the same seat as available. That does not grant either user ownership. For a hold, the API starts a database transaction, locks the requested seat rows (in a consistent ID order), and verifies they are still available or their previous hold has expired. It conditionally changes each seat from `available` to `held`, assigns the new order and expiry, and inserts the order items. The transaction commits only if every requested seat was acquired; otherwise it rolls back the whole selection and returns `409 Conflict`.

The conditional update (`WHERE status = 'available'`, with expired holds handled in the same transaction) and row lock serialize competing requests: only one transaction can change a given seat from available to held. Constraints ensure a seat has one current inventory row and cannot be attached to an order for another event. Thus the losing request sees the committed hold and fails rather than selling the same seat.

Payment is confirmed in a second transaction. The system verifies the order is still pending and unexpired, changes its held seats to `sold`, and marks the order paid. A late payment after expiry must be rejected or refunded, never used to overwrite a newer hold. Payment callbacks and client retries are idempotent. A periodic expiry worker returns unpurchased seats to available, but only if the expiring order still owns them.

## 6. Trade-offs

- **Strict database transactions versus maximum write throughput:** Serializing updates for the same seat limits throughput on a hot event, but it is necessary for correct seat ownership. The waiting room smooths the surge, while separate event partitions and horizontal API scaling can handle unrelated events in parallel.
- **Seat-map freshness versus read capacity:** Caching seat maps reduces database load during a sale, but availability can be briefly stale. The UI should label availability as provisional and the hold endpoint must revalidate against the primary.
- **Short holds versus checkout convenience:** Short, fixed-duration holds free inventory quickly and reduce abandoned reservations, but users may lose seats while paying. Longer holds improve checkout comfort but leave seats unavailable to others for longer.
- **Fair queue versus immediate access:** A waiting room improves predictability and fairness during a flash sale, but adds waiting time and operational complexity. It is most useful for scheduled, high-demand sales rather than ordinary browsing.
