# Movie Backend API

NestJS-based movie backend API with PostgreSQL database and TMDB integration.

## Features

- 🎬 **Movie & TV Series Management**: Complete CRUD operations for movies and TV series
- 📈 **Trending Content**: Real-time trending movies and TV shows
- 🔍 **Search Functionality**: Advanced search across movies and TV series
- 🔐 **Authentication**: JWT-based authentication with bcrypt password hashing
- 🔄 **Data Synchronization**: Automated TMDB API integration with cron jobs
- 📦 **PostgreSQL Integration**: TypeORM-powered database operations
- 🛡️ **Validation**: Request validation with class-validator
- 🚀 **Modern Stack**: Built with NestJS, TypeScript, and async/await

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT + Passport
- **Validation**: class-validator, class-transformer
- **Scheduling**: @nestjs/schedule (Cron jobs)
- **HTTP Client**: Axios for TMDB API calls
- **Password Hashing**: bcrypt

## API Endpoints

### Movies

- `GET /api/movies?page=1&genre=28&year=2023` - List movies with filtering
- `GET /api/movies/:id` - Get movie details

### TV Series

- `GET /api/tv?page=1&genre=16&year=2023` - List TV series with filtering
- `GET /api/tv/:id` - Get TV series details

### Trending

- `GET /api/trending` - Get trending content

### Search

- `GET /api/search?q=avengers&page=1` - Search movies and TV series

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd movie-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**
   Create a `.env` file in the root directory:

   ```env
   # Database Configuration
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USERNAME=postgres
   DATABASE_PASSWORD=your-password
   DATABASE_NAME=movie_db

   # JWT Configuration
   JWT_SECRET=your-secret-key-here
   JWT_EXPIRES_IN=7d

   # TMDB API Configuration
   TMDB_API_KEY=your-tmdb-api-key-here
   TMDB_BASE_URL=https://api.themoviedb.org/3

   # Application Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Setup PostgreSQL Database**

   - Create a PostgreSQL database named `movie_db`
   - Update database credentials in `.env`

5. **Get TMDB API Key**
   - Register at [The Movie Database (TMDB)](https://www.themoviedb.org/)
   - Get your API key from account settings
   - Add it to `.env` file

## Usage

### Development

```bash
npm run start:dev
```

### Production Build

```bash
npm run build
npm run start:prod
```

### API Testing

Once running, the API will be available at `http://localhost:8080/api` (backend runs on port 8080)

Example requests:

```bash
# Get movies
curl http://localhost:8080/api/movies

# Search content
curl "http://localhost:8080/api/search?q=avengers"

# Register user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

## Data Synchronization

The application automatically synchronizes data from TMDB API:

- **Frequency**: Every 30 minutes (configurable)
- **Content**: Popular movies, TV series, and trending content
- **Strategy**: Upsert (insert new, update existing)
- **Error Handling**: Rate limiting, timeout handling, retry logic

## Database Schema

### Movies

- Basic movie information from TMDB
- Release date, ratings, popularity
- Genre IDs for filtering

### TV Series

- TV series information with first air date
- Origin country and language data
- Genre categorization

### Trending

- Mixed content (movies and TV)
- Media type differentiation
- Real-time popularity data

### Users

- Encrypted passwords with bcrypt
- JWT-based session management
- Basic profile information

## Security Features

- 🔒 **JWT Authentication**: Secure token-based authentication
- 🛡️ **Password Hashing**: bcrypt with salt rounds
- 🚫 **Input Validation**: Request validation and sanitization
- 🔐 **Environment Variables**: Secure API key management
- 🌐 **CORS Configuration**: Cross-origin request handling

## Error Handling

- Standardized JSON error responses
- HTTP status codes (200, 400, 404, 500)
- Detailed error messages for development
- Rate limiting protection for external API calls
- Database connection error handling

## Development Guidelines

### Project Structure

```
src/
├── auth/           # Authentication guards and strategies
├── controllers/    # API controllers
├── dto/           # Data Transfer Objects
├── entities/      # Database entities
├── interfaces/    # TypeScript interfaces
├── modules/       # NestJS modules
├── repositories/  # Database repositories
├── services/      # Business logic services
├── tasks/         # Cron job tasks
└── main.ts       # Application entry point
```

### Adding New Features

1. Create entity in `src/entities/`
2. Add repository in `src/repositories/`
3. Create service in `src/services/`
4. Add controller in `src/controllers/`
5. Register in appropriate module

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
