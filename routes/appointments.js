const express = require('express');
const router  = express.Router();
const {
  createAppointment,
  getAppointments,
  updateAppointment,
  deleteAppointment,
} = require('../controllers/appointmentsController');
const { bulkUpsert } = require('../controllers/bulkAppointmentController'); // ★ 추가

// 단건 CRUD
router.post('/',    createAppointment);
router.get('/',     getAppointments);
router.patch('/:id',updateAppointment);
router.delete('/:id',deleteAppointment);

// 배치 저장 (미리보기 → 편집 완료 후 호출)
router.post('/bulk', bulkUpsert);   // ★ 추가

module.exports = router;
