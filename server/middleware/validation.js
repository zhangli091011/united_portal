const { body, validationResult } = require('express-validator')

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: '数据验证失败',
      errors: errors.array()
    })
  }
  next()
}

const registrationValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('参演单位不能为空')
    .isLength({ min: 1, max: 100 })
    .withMessage('参演单位长度应在1-100字符之间'),
  
  body('contact')
    .trim()
    .notEmpty()
    .withMessage('联系方式不能为空')
    .matches(/^\d{5,12}$/)
    .withMessage('请输入有效的QQ号'),
  
  body('type')
    .trim()
    .notEmpty()
    .withMessage('作品类型不能为空'),
  
  body('programName')
    .trim()
    .notEmpty()
    .withMessage('作品名称不能为空')
    .isLength({ min: 1, max: 200 })
    .withMessage('作品名称长度应在1-200字符之间'),
  
  body('performers')
    .trim()
    .notEmpty()
    .withMessage('演职人员不能为空'),
  
  body('copyright')
    .trim()
    .notEmpty()
    .withMessage('请确认版权信息'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('作品介绍不能超过1000字符'),
  
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('备注不能超过500字符'),
  
  handleValidationErrors
]

const loginValidation = [
  body('employeeCode')
    .if(body('type').equals('employee'))
    .notEmpty()
    .withMessage('员工编码不能为空'),
  
  body('username')
    .if(body('type').equals('username'))
    .notEmpty()
    .withMessage('用户名不能为空'),
  
  body('password')
    .if((value, { req }) => req.body.type === 'employee' || req.body.type === 'username')
    .notEmpty()
    .withMessage('密码不能为空'),
  
  body('code')
    .if(body('type').equals('feishu'))
    .notEmpty()
    .withMessage('授权码不能为空'),
  
  handleValidationErrors
]

module.exports = {
  registrationValidation,
  loginValidation,
  handleValidationErrors
}
