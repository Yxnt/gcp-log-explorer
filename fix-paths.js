const fs = require('fs');
const path = require('path');

function fixPaths(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixPaths(filePath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace absolute paths with relative paths in HTML attributes
      content = content.replace(/href="\/_next\//g, 'href="./_next/');
      content = content.replace(/src="\/_next\//g, 'src="./_next/');
      content = content.replace(/href="\/favicon\.ico"/g, 'href="./favicon.ico"');
      
      // Replace absolute paths in inline JavaScript/JSON
      content = content.replace(/\\"\/favicon\.ico\\"/g, '\\"./favicon.ico\\"');
      content = content.replace(/\\"href\\":\\"\/favicon\.ico\\"/g, '\\"href\\":\\"./favicon.ico\\"');
      content = content.replace(/\\"href\\":\\"\/([^"]*)\\"(?=,|\})/g, '\\"href\\":\\"./$1\\"');
      
      // Fix paths in JavaScript strings within script tags
      content = content.replace(/"\/favicon\.ico"/g, '"./favicon.ico"');
      content = content.replace(/"href":"\/favicon\.ico"/g, '"href":"./favicon.ico"');
      
      fs.writeFileSync(filePath, content);
      console.log(`Fixed paths in: ${filePath}`);
    }
  });
}

// Fix paths in the out directory
fixPaths('./out');
console.log('Path fixing completed!');