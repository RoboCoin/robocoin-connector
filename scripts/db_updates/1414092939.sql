create table log_archive (
 time_archived timestamp not null default CURRENT_TIMESTAMP,
 log_entries text not null
);
