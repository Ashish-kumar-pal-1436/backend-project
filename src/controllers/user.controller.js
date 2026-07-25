import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponce } from '../utils/ApiResponce.js'

const generateAccessAndRefreshToken = async (userId) =>{

    try {

        const user = await User.findById(userId)
        const accessToken =  user.generateAccessToken()
        const refreshToken=  user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false}) 

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500,  error.message || "Somethingw went wrong ")
    }
}

const registerUser = asyncHandler(async (req, res) =>{
     // get user details from frontend
     // validation - not empty
     // check if user already exists : username , email
     // check for images, check for avatar
     // upload them to clodinary
     // create user object - create entry in db
     // remove password and refresh token field from response
     // check for user creation
     // return res

     //get user details from frontend
     const {fullname, email, username, password} = req.body

     //we can do this way one by one for all fields
    //  if(fullname===""){
    //     throw new ApiError(400, "fullname is required")
    //  } 

    // Better way to handle

    if(
        [fullname, email, username, password].some((field) => 
        field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    // cheack if user already exist
    const existesdUser = await User.findOne({
        $or: [{username}, {email}]
    }) 

    if(existesdUser){
        throw new ApiError(409, "User with email or username already exist")
    }

    // check for images, check for avatar

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    // upload on cloudinary

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    } 

   // create user object - create entry in db
   const user = await User.create({
        fullname, 
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(501, "Something went wrong while creating the user")
    }

    // returing the responce

    return res.status(201).json(
        new ApiResponce(200, createdUser, "User Registered successfully")
    )

}) 

const loginUser = asyncHandler(async (req, res) => {
      // req body --> data
      // username or email --> login
      // find the user
      // password check
      // access and refresh token
      // send cookie
      // send responce 

    // req body --> getting data from user
     const {email, password, username} = req.body
     if(!username && !email){
        throw new ApiError(400, "username or email required")
     } 

     //find the user
     const user = await User.findOne({
        $or: [{username}, {email}]
     })

     if(!user){
        throw new ApiError(404, "User doesn't exist")
     } 
     
     // password check
     const isPasswordValid =  await user.isPasswordCorrect(password)
     
     if(! isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
     } 

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options ={
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponce(
            200,
            {
                user:loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully"
        )
    )
})

const logoutUser = asyncHandler( async (req, res) => {
     await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },

        {
            new: true
        }
      )

      const options = {
        httpOnly: true,
        secure: true
      }

      return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponce(201, "User logged Out"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}