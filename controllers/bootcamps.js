const path = require("path")
const ErrorResponse = require("../utils/errorResponse")
const asyncHandler = require("../middleware/async")
const geocoder = require("../utils/geocoder")
const Bootcamp = require("../models/Bootcamp")

// @desc    Get all bootcamps
// @route   GET /api/v1/bootcamps
// @access  Public
// exports.getBootcamps = async (req, res, next) => {
// 	try {
// 		const bootcamps = await Bootcamp.find()
// 		res.status(200).json({ success: true, count: bootcamps.length, data: bootcamps })
// 	} catch (err) {
// 		next(err)
// 	}
// }
exports.getBootcamps = asyncHandler(async (req, res, next) => {
	res.status(200).json(res.advancedResults)
})

// @desc    Get single bootcamp
// @route   GET /api/v1/bootcamps/:id
// @access  Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
	const bootcamp = await Bootcamp.findById(req.params.id)
	if (!bootcamp) {
		// return res.status(400).json({ success: false })
		return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}.`, 404))
	}
	res.status(200).json({ success: true, data: bootcamp })
})

// @desc    Get bootcamps within a raduis
// @route   GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access  Private
exports.getNearbyBootcamps = asyncHandler(async (req, res, next) => {
	const { zipcode, distance } = req.params

	// Get lat/lng from geocoder
	const loc = await geocoder.geocode(zipcode)
	const lat = loc[0].latitude
	const lng = loc[0].longitude

	// Calc radius using radians
	// Divide distance by radius of the earth
	// Radius of Earth = 3,963 mi / 6,378 km
	const radius = distance / 3963
	const bootcamps = await Bootcamp.find({
		location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
	})

	res.status(200).json({
		success: true,
		count: bootcamps.length,
		data: bootcamps
	})
})

// @desc    Create new bootcamp
// @route   POST /api/v1/bootcamps
// @access  Private
// TODO: compare async await to .then
exports.createBootcamp = asyncHandler(async (req, res, next) => {
	// Add user to body
	req.body.user = req.user.id

	// Check for published bootcamp by user
	const publishedBootcamp = await Bootcamp.findOne({ user: req.user.id })

	// If user is not admin, only one bootcamp allowed
	if (publishedBootcamp && req.user.role !== "admin") {
		return next(
			new ErrorResponse(`The user with id ${req.user.id} has already published a bootcamp`, 400)
		)
	}

	const bootcamp = await Bootcamp.create(req.body)

	res.status(201).json({
		success: true,
		data: bootcamp
	})
})

// @desc    Update bootcamp
// @route   PUT /api/v1/bootcamps/:id
// @access  Private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
	let bootcamp = await Bootcamp.findById(req.params.id)

	if (!bootcamp) {
		return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}.`, 404))
	}

	// Ensure user is bootcamp owner
	if (bootcamp.user.toString() !== req.user.id && req.user.role !== "admin") {
		return next(
			new ErrorResponse(`User ${req.params.id} is not authorized to update this bootcamp`, 401)
		)
	}

	bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
		new: true,
		runValidators: true
	})

	res.status(200).json({ success: true, data: bootcamp })
})

// @desc    Delete bootcamp
// @route   DELETE /api/v1/bootcamps/:id
// @access  Private
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
	// const bootcamp = await Bootcamp.findByIdAndDelete(req.params.id)
	const bootcamp = await Bootcamp.findById(req.params.id)
	if (!bootcamp) {
		return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}.`, 404))
	}

	// Ensure user is bootcamp owner
	if (bootcamp.user.toString() !== req.user.id && req.user.role !== "admin") {
		return next(
			new ErrorResponse(`User ${req.params.id} is not authorized to delete this bootcamp`, 401)
		)
	}

	bootcamp.remove()

	res.status(200).json({ success: true, data: {} })
})

// @desc    Upload photo for bootcamp
// @route   PUT /api/v1/bootcamps/:id/photo
// @access  Private
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {
	const bootcamp = await Bootcamp.findById(req.params.id)
	if (!bootcamp) {
		return next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}.`, 404))
	}

	// Ensure user is bootcamp owner
	if (bootcamp.user.toString() !== req.user.id && req.user.role !== "admin") {
		return next(
			new ErrorResponse(`User ${req.params.id} is not authorized to update this bootcamp`, 401)
		)
	}

	if (!req.files) {
		return next(new ErrorResponse(`Please upload a file.`, 400))
	}

	const file = req.files.file

	// Make sure upload is a photo
	if (!file.mimetype.startsWith("image")) {
		return next(new ErrorResponse(`Please upload an image file.`, 400))
	}

	// Check file size

	if (file.size > process.env.MAX_FILE_UPLOAD) {
		return next(
			new ErrorResponse(`Please upload an image under ${process.env.MAX_FILE_UPLOAD} bytes.`, 400)
		)
	}

	// create custom filename
	file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`

	file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
		if (err) {
			console.error(err)
			return next(new ErrorResponse(`Problem with file upload.`, 500))
		}

		await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name })

		res.status(200).json({ success: true, data: file.name })
	})
})
