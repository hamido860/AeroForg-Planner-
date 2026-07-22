fetch('http://localhost:3000/api/scheduler/jobs')
  .then(res => res.json())
  .then(data => {
      console.log("Jobs count:", data.length);
      if(data.length > 1) {
          console.log("Second job sample:", {
              id: data[1].id,
              job_status: data[1].job_status,
              scheduled_start: data[1].scheduled_start_at,
              planned_start: data[1].heliosOrder?.planned_start_at
          });
      }
  })
  .catch(console.error);
