git config --global --add safe.directory /workspace/host-machine-workspace/
git config --global --add safe.directory /workspace/host-machine-workspace/.git

if [ "$(ls -A /workspace/container-workspace)" ]; then
  echo "containers workspace already has files, skipping clone"
  cd /workspace/container-workspace
  git fetch host
else
  echo "containers workspace doesn't exist, making a copy from host's git"
  git clone /workspace/host-machine-workspace /workspace/container-workspace
  cd /workspace/container-workspace
  branchName="dev-container-branch-$(date '+%Y-%m-%d-%H-%M-%S')"
  git branch $branchName
  git checkout $branchName

  git remote remove origin
  git remote add origin "$(cd /workspace/host-machine-workspace && git remote get-url origin)"
  git config user.name "$(cd /workspace/host-machine-workspace && git config user.name)"
  git config user.email "$(cd /workspace/host-machine-workspace && git config user.email)"
  git remote add host /workspace/host-machine-workspace

  echo '#!/bin/sh' >> .git/hooks/post-commit
  echo 'branch=$(git rev-parse --abbrev-ref HEAD)' >> .git/hooks/post-commit
  echo 'if [ $branch != "HEAD" ]; then' >> .git/hooks/post-commit
  echo '  git push host --force -q $branch:$branch' >> .git/hooks/post-commit
  echo 'fi' >> .git/hooks/post-commit
  chmod +x .git/hooks/post-commit

  cp .git/hooks/post-commit .git/hooks/post-rewrite
fi


# The following lines will push all branches on the containers local repo to the host machines repo

echo "post-create.sh script exectution complete"