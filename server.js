const express = require("express")
const dotenv = require("dotenv")
const colors = require("colors")
const morgan = require("morgan")
//const logger = require("./middleware/logger")
const connectDB = require("./config/db")
// Route files
const bootcamps = require("./routes/bootcamps")

// Load env vars
dotenv.config({ path: "./config/config.env" })

// Connect to database
connectDB()

const app = express()

// Body parser
app.use(express.json())

//app.use(logger)

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
	app.use(morgan("dev"))
}

// Mount routers
app.use("/api/v1/bootcamps", bootcamps)

const port = process.env.PORT || 5000

const server = app.listen(
	port,
	console.log(`Server running in ${process.env.NODE_ENV} mode on port ${port}`.yellow.bold)
)

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
	console.log(`Error: ${err.message}`.black.bgRed)
	// Close server & exit process
	server.close(() => {
		process.exit(1)
	})
})
