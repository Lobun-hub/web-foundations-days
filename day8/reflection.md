# Reflection

The most difficult concept in the course was designing a system that stays correct when many requests happen at the same time. It was easy to describe a seat as “available” on a page, but harder to see why that page can be stale and cannot make the final decision. I worked through it by tracing two users trying to hold the same seat, then assigning the authoritative decision to a database transaction with a conditional update, row lock, and constraints. Thinking through the losing request made the design clearer.

Based on the feedback I received, I would improve the capstone's explanation of the purchase flow. I would add a sequence diagram showing the waiting room, seat hold, payment provider, and database transitions, including what happens when payment arrives after a hold expires. That would make the correctness guarantees and failure cases easier to review than a component diagram alone.

Next, I will learn how to test and operate this design under realistic load: build a small prototype, generate concurrent hold requests, and measure latency and database contention. I also want to learn more about payment webhooks and idempotency, since a reliable payment confirmation is essential to issuing a ticket exactly once.
