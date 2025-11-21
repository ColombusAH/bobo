// Uncomment this line to use CSS modules
// import styles from './app.module.css';
import NxWelcome from './nx-welcome';

export function App() {
  return (
    <div>
      <h1 className="text-3xl font-bold underline text-red-500">Hello World</h1>
      <NxWelcome title="@org/web" />
    </div>
  );
}

export default App;
