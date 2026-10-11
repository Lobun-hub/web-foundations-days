# SnapShare Scaling Plan

## Assumptions and estimates

- There are 10 million registered users; 10% are active each day, so daily active users (DAU) = 10,000,000 × 0.10 = 1,000,000.
- Each daily active user uploads one photo and views 50 feed pages per day.
- Each original photo is 2 MB and gets one 50 KB thumbnail.
- A year has 365 days; daily activity is spread evenly over 24 hours for average-rate estimates. Feed peak traffic is assumed to reach 5× its average rate. Real traffic may vary.
- Storage estimates use decimal units (1 TB = 1,000,000 MB) and count original photos and thumbnails only. They exclude metadata, backups, replication, and any photo deletions.

| Measure | Calculation | Estimate |
| --- | --- | --- |
| Photo uploads (average) | 1,000,000 uploads/day ÷ 86,400 seconds/day | About 11.6 uploads/second |
| Feed page views (average) | 1,000,000 users × 50 pages/day ÷ 86,400 seconds/day | About 579 feed views/second |
| Feed page views (peak) | 579 average views/second × 5 | About 2,894 feed views/second |
| Original photo storage per year | 1,000,000 × 2 MB × 365 | 730 TB/year |
| Thumbnail storage per year | 1,000,000 × 50 KB × 365 | 18.25 TB/year |
| Total new photo-file storage per year | 730 TB + 18.25 TB | About 748.25 TB/year |

SnapShare is **read-heavy**: there are 50 feed page views for every photo upload, before counting the multiple photo-file reads each feed page can trigger. This means the design should scale read paths separately from writes: serve cached feed data and photos through the CDN, use the cache for hot metadata, and direct database reads to the read replica so feed traffic does not overwhelm the primary that accepts writes.

## Why photos belong in object storage

The database should store photo metadata and object-storage keys, not the image bytes. Large binary files would inflate the database and its backups, consume database capacity and bandwidth, and make ordinary metadata queries and scaling more expensive. Object storage is designed to store large files durably and cost-effectively, while the CDN can cache and deliver those files close to users.

## Architecture

```text
[Clients] --upload/feed--> [Load balancer] --> [App servers]
    |                                            |--> [Cache] --miss--> [Read replica]
    |                                            |--> [Database primary] --replication--> [Read replica]
    |                                            |--> [Object storage] (original photos)
    |                                            `--> [Upload queue] --> [Thumbnail worker]
    |                                                                       |         |
    |                                                         update metadata         `--> [Object storage] (thumbnails)
    |                                                               to primary
    `--photo reads--> [CDN] --cache miss/origin--> [Object storage]
```

### What each component solves

- **CDN:** Serves frequently requested photo files from edge locations, reducing latency and origin traffic.
- **Load balancer:** Distributes incoming requests across healthy app servers so one server does not become a bottleneck.
- **App servers:** Authenticate users and handle upload, feed, and metadata operations without storing request state on a single machine.
- **Cache:** Keeps hot feed data and metadata close to the app servers to reduce repeated database reads.
- **Database primary:** Stores durable user, follow, and photo metadata and accepts metadata writes.
- **Read replica:** Serves read queries separately from the primary, increasing read capacity while allowing some replication lag.
- **Object storage:** Stores the large original photo and thumbnail files durably without putting file contents in the database.
- **Upload queue:** Buffers thumbnail work so image processing does not hold up an upload response and can be retried independently.
- **Thumbnail worker:** Pulls queued jobs, creates a 50 KB thumbnail from the original, and writes it to object storage.

## Photo upload flow

1. The client sends the photo and request to the load balancer, which routes it to an app server.
2. The app server authenticates the user, validates the upload, and writes the original photo to object storage.
3. After the original is stored, the app server writes the photo metadata (including its storage key and owner) to the database primary.
4. The app server adds a thumbnail-generation job to the upload queue and returns the upload result to the client.
5. A thumbnail worker consumes the job, reads the original from object storage, generates a thumbnail, and stores it there.
6. The worker marks the thumbnail as ready in the photo metadata; the CDN can then serve the original and thumbnail on later requests.

## Trade-offs

- **Asynchronous thumbnails improve upload latency but delay thumbnail availability.** The app can confirm the original upload before processing finishes, but feeds must handle a thumbnail that is not ready yet.
- **A read replica and cache increase feed capacity but can serve stale data.** Replica lag or cached entries may briefly hide a recent upload or follow change; cache expiration and invalidation need to balance freshness against load.
- **Serving photos through a CDN reduces latency and object-storage traffic but adds cache-management complexity.** Replaced or removed photos may remain available at edge locations until their cached copies expire or are purged.
- **Fan-out-on-read keeps upload work simple but costs more on feed reads.** The app can assemble a user's feed from the accounts they follow when requested, which avoids writing a feed entry for every follower but increases per-request database and cache work.
