fetch('http://localhost:3000/api/scheduler/jobs')
  .then(res => res.json())
  .then(data => {
      console.log("Jobs count:", data.length);
      for(let i=0; i<3; i++) {
        if(data[i]) {
          console.log(`Job [${i}] sample:`, {
              id: data[i].id,
              job_status: data[i].job_status,
              scheduled_start: data[i].scheduled_start_at,
              planned_start: data[i].heliosOrder?.planned_start_at || data[i].planned_start_at
          });
        }
      }
  })
  .catch(console.error);
