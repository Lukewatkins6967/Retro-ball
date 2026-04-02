## Unity Extraction Summary

Source build:
- `C:\Users\hardc23\Desktop\Basketball-Project\KarateBasketball-1-5-Win`

Export outputs:
- Primary content: `C:\Users\hardc23\Desktop\Basketball-Project\combined-app\unity-extract\primary-content`
- Reconstructed Unity project: `C:\Users\hardc23\Desktop\Basketball-Project\combined-app\unity-extract\unity-project\ExportedProject`

High-value art:
- Court texture: `C:\Users\hardc23\Desktop\Basketball-Project\combined-app\unity-extract\primary-content\Assets\Texture2D\courtTimber.png`
- Hoops: `C:\Users\hardc23\Desktop\Basketball-Project\combined-app\unity-extract\primary-content\Assets\Texture2D\hoop-blue.png`, `C:\Users\hardc23\Desktop\Basketball-Project\combined-app\unity-extract\primary-content\Assets\Texture2D\hoop-red.png`
- Ball: `C:\Users\hardc23\Desktop\Basketball-Project\combined-app\unity-extract\primary-content\Assets\Texture2D\Ball.png`
- Character sprite sheets:
  - `dellavedova_*`
  - `green_*`
  - `paul_*`
  - `peace_*`

Key gameplay / physics references:
- `C:\Users\hardc23\Desktop\Basketball-Project\combined-app\unity-extract\unity-project\ExportedProject\Assets\Scripts\Assembly-CSharp\Basketball.cs`
- `C:\Users\hardc23\Desktop\Basketball-Project\combined-app\unity-extract\unity-project\ExportedProject\Assets\Scripts\Assembly-CSharp\Player.cs`
- `C:\Users\hardc23\Desktop\Basketball-Project\combined-app\unity-extract\unity-project\ExportedProject\Assets\Scripts\Assembly-CSharp\AIController.cs`
- `C:\Users\hardc23\Desktop\Basketball-Project\combined-app\unity-extract\unity-project\ExportedProject\Assets\Scripts\Assembly-CSharp\PhysicsConstraints.cs`
- `C:\Users\hardc23\Desktop\Basketball-Project\combined-app\unity-extract\unity-project\ExportedProject\Assets\Scripts\Assembly-CSharp\Constants.cs`

Notable extracted physics values:
- Ball physic material: dynamic friction `0.6`, static friction `0.6`, bounciness `0.7`
- Pass speed constant: `10`
- Ball-through-net minimum down speed: `-1`

Web integration staging area:
- Reused runtime assets for the site are copied into `C:\Users\hardc23\Desktop\Basketball-Project\combined-app\public\unity-arcade`

Notes:
- This build was extracted from a compiled Unity 5.4.2f2 Windows game, not from the original Unity project.
- The exported Unity project is best treated as a reference / asset source rather than a drop-in browser runtime.
