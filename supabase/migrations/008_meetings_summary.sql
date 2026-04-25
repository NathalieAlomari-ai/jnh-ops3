-- Add summary column to meetings table
alter table meetings add column if not exists summary text;
