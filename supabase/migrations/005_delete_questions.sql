-- Clear all questions and their responses so fresh questions can be uploaded
delete from responses where question_uid in (select question_uid from questions);
delete from questions;
