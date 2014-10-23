LATEST_VERSION=$(psql robocoin_connector -c "SELECT MAX(version) FROM db_versions;" | sed -n 3P | tr -d ' ')
for file in `ls scripts/db_updates | sort -V`
do
 FILE_NAME=$(basename $file)
 WITHOUT_EXTENSION="${FILE_NAME%.*}"
 if [ "$WITHOUT_EXTENSION" -gt "$LATEST_VERSION" ]
  then
   echo "Running " $file
   psql robocoin_connector < scripts/db_updates/$file
   psql robocoin_connector -c "INSERT INTO db_versions VALUES ($WITHOUT_EXTENSION)"
 fi
done
echo "Done"

