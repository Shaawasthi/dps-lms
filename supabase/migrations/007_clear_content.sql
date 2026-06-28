-- Clear all content so fresh curriculum, misconceptions and questions can be uploaded.
-- Order matters: responses → questions → misconceptions → curriculum (FK dependencies).

delete from responses;
delete from questions;
delete from misconceptions;
delete from curriculum;
