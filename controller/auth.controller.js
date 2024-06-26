const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../model/User')
const transport = require('../util/sendmail')

exports.registration = async (req, res) => {
    try {
        const data = { ...req.body };
        let avatar = 'def.png';
        if (req.file !== undefined) {
            avatar = req.file.filename;
        }
        data.avatar = avatar
        const userCheck = await User.findOne({ email: data.email })
        if (userCheck) {
            return res.json({ data: [], status: false, message: 'User already exits!!' });
        }
        data.userRole = 2
        const userData = new User(data)
        const user1 = await userData.save()
        if (!user1) {
            return res.json({ data: [], status: false, message: `User not Registered!!` })
        }
        user1.password = ""
        return res.json({ data: [user1], status: true, message: `User's registered successfully!!` })
    }
    catch (error) {
        return res.json({ data: [], status: false, message: error.message })
    }

}

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body
        if (username === "") {
            return res.json({ data: [], status: false, message: "Please enter email to login!!!" })
        }

        let user = await User.findOne({ email: username })
        if (user.isActive === false) {
            return res.json({ data: [], status: false, message: 'Your account is deactivated!!' });
        }
        if (!user) {
            return res.json({ data: [], status: false, message: 'User does not exist!!' });
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.json({ data: [], status: false, message: 'Invalid password!!' });
        }
        const token = jwt.sign({
            email: user.email,
            _id: user._id.toString(),
        }, process.env.SECRET_KEY, { expiresIn: '30d' });
        let userData = user._doc
        userData['token'] = token
        userData['password'] = ""
        return res.json({ data: [userData], status: true, message: 'Login successfully!!' })
    } catch (error) {
        return res.json({ data: [], status: false, message: error.message })
    }
}

exports.me = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.logInid })
            .select('-password -__v -createdAt -updatedAt -wrongAttempt')

        if (!user) {
            return res.json({ data: [], status: false, message: 'User does not exits!!' });
        }
        return res.json({ data: [user], status: true, message: "Logged in User's data." });
    } catch (error) {
        return res.json({ data: [], status: false, message: error.message })
    }
}

exports.forgotPassLink = async (req, res) => {
    try {
        const { email } = req.body
        const user = await User.findOne({ email: email })
        if (!user) {
            return res.json({ data: [], status: false, message: 'Email does no exist!!' })
        }
        else {
            const password = Math.random().toString(36).slice(-8);
            const hashPass = await bcrypt.hash(password, 10)
            await User.findOneAndUpdate({ email: email },
                {
                    password: hashPass
                }
            )
            transport.sendMail({
                to: email,
                from: 'fparmar986@gmail.com',
                subject: 'Change Password!!',
                html: `<h1>Change your password!!</h1><br />
                        <h2>Hello ${user.name}!!.</h2><br />
                        <p>Your new password is :  ${password}</p>
                        `
            })
            if (!transport) {
                return res.status(404).json({ message: 'Somthing went wrong!!Can not sent mail to your emailid!!' })
            }
            return res.json({ data: [], status: true, message: 'Mail sent to your emailid!!!' })
        }
    } catch (error) {
        return res.json({ data: [], status: false, message: error.message })
    }
}

// exports.forgotPassword = async (req, res) => {
//     try {
//         const { password, resetPasswordToken } = req.body
//         const user = await User.findOne({ resetPasswordToken })
//         let curTime = new Date().getTime();
//         let extime = (user.expireToken).getTime();
//         let diff = extime - curTime;
//         if (diff < 0) {
//             return res.json({ data: [], status: false, message: 'Link exprired!!, Please send again!!' })
//         }
//         user.password = password;
//         const updatePassword = await user.save()
//         if (!updatePassword) {
//             return res.json({ data: [], status: false, message: 'Password is not updated!!' })
//         }
//         await User.findOneAndUpdate({ email: user.email },
//             {
//                 wrongAttempt: 0,
//                 resetPasswordToken: "",
//                 expireToken: ""
//             })
//         return res.json({ data: [], status: true, message: 'Password Updated!!' })
//     } catch (error) {
//         return res.json({ data: [], status: false, message: error.message })
//     }
// }

exports.resetPassword = async (req, res) => {
    try {
        const { currpassword, password } = req.body
        const check = await User.findOne({ _id: req.logInid }).populate('password')
        const isMatch = await bcrypt.compare(currpassword, check.password)
        if (!isMatch) {
            return res.json({ data: [], status: false, message: 'Current password is invalid!!' });
        }
        const hashPass = await bcrypt.hash(password, 10)
        const passswordStatus = await User.findByIdAndUpdate(req.logInid, {
            $set: { password: hashPass }
        })
        if (!passswordStatus) {
            return res.json({ data: [], status: false, message: 'Somthing went wrong!!' })
        }
        return res.json({ data: [], status: true, message: 'Password changed!!' })
    } catch (error) {
        return res.json({ data: [], status: false, message: error.message })
    }
}