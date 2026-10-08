# Library Books API

Base path: `/books`

## Endpoints

- **List books**
  - Method and path: `GET /books`
  - Description: Returns all books in the library.
  - Success status: `200 OK`

- **Get one book**
  - Method and path: `GET /books/{id}`
  - Description: Returns the book with the specified ID.
  - Success status: `200 OK`

- **Create a book**
  - Method and path: `POST /books`
  - Description: Adds a new book to the library.
  - Example request body: `{"title":"The Hobbit","author":"J.R.R. Tolkien","publishedYear":1937}`
  - Success status: `201 Created`

- **Update a book**
  - Method and path: `PUT /books/{id}`
  - Description: Replaces the details of the book with the specified ID.
  - Example request body: `{"title":"The Hobbit","author":"J.R.R. Tolkien","publishedYear":1937}`
  - Success status: `200 OK`

- **Delete a book**
  - Method and path: `DELETE /books/{id}`
  - Description: Deletes the book with the specified ID.
  - Success status: `204 No Content`

- **List books by author**
  - Method and path: `GET /books?author=J.R.R.%20Tolkien`
  - Description: Returns books whose author matches the `author` query parameter.
  - Success status: `200 OK`

## Error responses

- `400 Bad Request`: The request has invalid data, such as a create-book request missing the required `title`.
- `404 Not Found`: The requested book ID does not exist, such as `GET /books/9999`.
