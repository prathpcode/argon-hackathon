import { NewRevivalForm } from "@/components/NewRevivalForm";

export default function NewRevival() {
  return (
    <main className="main">
      <div className="narrow">
        <h1 className="page-title">Revive a game</h1>
        <p className="page-lede">Name a game that can't be played anymore. Add gameplay videos if you know some, or the agents will search for them.</p>
        <NewRevivalForm />
      </div>
    </main>
  );
}
