import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponce } from '../utils/ApiResponce.js'

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

export {registerUser}