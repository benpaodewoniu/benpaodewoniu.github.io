cd ~/blog
hexo g
cd ~/blog_web
cp -r ../blog/public/* ./
git add .
git commit -m 'update'
git push origin master
