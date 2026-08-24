const fs = require('fs');
let code = fs.readFileSync('src/components/WatchRoom.tsx', 'utf8');

// The file currently has too many </div> tags at the end
code = code.replace(
  `    </div>
    </div>
    </div>
  );
}`, 
  `    </div>
  );
}`
);

fs.writeFileSync('src/components/WatchRoom.tsx', code);
console.log("Fixed WatchRoom divs");
