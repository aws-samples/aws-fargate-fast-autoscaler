#!/bin/bash
# set -euo pipefail
# set -x

export PATH=$PATH:/opt/awscli

region=${region-us-west-2}

echo $1 >&2


# echo $1
# we are getting $cluster and $service from lambda env vars



function listTasks(){
    aws --region $region ecs list-tasks --service-name $service --cluster $cluster --query "taskArns" --output text | sed -e 's/\t/ /g'
}

function describeTasks(){
    aws --region $region ecs describe-tasks --cluster $1 --tasks $2 --query "tasks[?lastStatus=='RUNNING'].attachments[0].details[-1].value" --output text
}

function getActiveConnCount(){
    curl -s --max-time 5 http://$1/nginx_status | grep ^Act | awk '{print $NF}'
}

function updateEcsServiceDesiredCount() {
    aws --region $region ecs update-service --service $service --cluster $cluster --desired-count $1
}

function resp(){
cat <<EOF
{"status": "OK", "last_desired": $desired, "last_desired_ts": $ts, "region": "$region", "cluster": "$cluster", "service": "$service" }
EOF
}

#
# Your business logic starts here
#
desired=$(echo $1 | jq -r '.Desired | select(type == "number")')


# get current task count
tasks=$(listTasks)


if [[ -n ${desired} ]]; then
  if [[ ${disable_scalein} == 'yes' && ${desired} -le ${#tasks[@]} ]]; then
        echo "found disable_scalein=yes, desired attribute ignored" >&2
  else
        updateEcsServiceDesiredCount ${desired} > /dev/null || echo "update service failed" >&2
        ts=$(date +%s)
        resp
        exit 0
  fi 

fi



if [[ ${#tasks[@]} == 0 || "${tasks[@]} X" == " X" ]]; then
    echo "no tasks found" >&2
cat <<EOF
{"total": 0, "sampletaskcnt": 0, "totaltaskcnt": 0, "avg": 0}
EOF
    exit 0 
fi

taskIps=($(describeTasks $cluster "${tasks}"))

total=0
sampletaskcount=0

# slice the first 3 elements as the sample
for ip in ${taskIps[@]:0:3}
do 
  _total=$(getActiveConnCount $ip)
  total=$(( $(getActiveConnCount $ip) + $total ))
  sampletaskcount=$(($sampletaskcount+1))
done

# in case $sampletgaskcount is 0
if [[ $sampletaskcount == 0  ]]; then
    echo "sampletaskcount=0 error" >&2
cat <<EOF
{"total": $total, "sampletaskcnt": 0, "totaltaskcnt": "${#tasks[@]}", "avg": 0}
EOF
    exit 0 
fi


avg=$(($total / $sampletaskcount))

cat <<EOF
{"total": $total, "sampletaskcnt": $sampletaskcount, "totaltaskcnt": "${#tasks[@]}", "avg": $avg}
EOF

