// index.js
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, transformCharacterData } from "../../constants";
import myEpicGame from "../../utils/MyEpicGame.json";
import "./Arena.css";
import LoadingIndicator from "../LoadingIndicator";

const Arena = ({ characterNFT, setCharacterNFT, currentAccount }) => {
  const [gameContract, setGameContract] = useState(null);
  const [boss, setBoss] = useState(null);
  const [win, setWin] = useState(false);
  const [allPlayers, setAllPlayers] = useState(null);
  const [otherPlayers, setOtherPlayers] = useState(null);
  const [attackState, setAttackState] = useState("");
  const [showToast, setShowToast] = useState(false);

  const runAttackAction = async () => {
    try {
      if (gameContract) {
        setAttackState("attacking");
        console.log("Attacking boss...");

        const attackTxn = await gameContract.attackBoss();
        await attackTxn.wait();
        console.log("attackTxn:", attackTxn);

        setAttackState("hit");

        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 5000);
      }
    } catch (error) {
      console.error("Error attacking boss:", error);
      setAttackState("");
    }
  };

  const renderActivePlayersList = () =>
    otherPlayers.map((player, index) => (
      <div className="player" key={player.name}>
        <div className="image-content">
          <h2>{player.name}</h2>
          <img
            src={`https://cloudflare-ipfs.com/ipfs/${player.imageURI}`}
            alt={`Character ${player.name}`}
          />
          <div className="health-bar">
            <progress value={player.hp} max={player.maxHp} />
            <p>{`${player.hp} / ${player.maxHp} HP`}</p>
          </div>
        </div>
        <div className="stats">
          <h4>{`⚔️ Attack Damage: ${player.attackDamage}`}</h4>
        </div>
      </div>
    ));

  useEffect(() => {
    const fetchBoss = async () => {
      const bossTxn = await gameContract.getBigBoss();
      console.log("Boss:", bossTxn);
      const bossData = transformCharacterData(bossTxn);
      setBoss(bossData);
      if (bossData.hp === 0) {
        setWin(true);
      }
    };

    // const getAllPlayers = async () => {
    //   try {
    //     console.log("Getting contract all players");
    //     const playersTxn = await gameContract.getAllPlayers();

    //     const players = playersTxn.map((playerData) =>
    //       transformCharacterData(playerData)
    //     );
    //     setAllPlayers(players);
    //     console.log("Players:", players);
    //   } catch (error) {
    //     console.error("Something went wrong fetching all players:", error);
    //   }
    // };

    const getOtherPlayers = async () => {
      try {
        console.log("Getting contract all players");
        const playersTxn = await gameContract.getAllPlayers();
        const id = await gameContract.nftHolders(currentAccount);

        const players = playersTxn
          .filter((playerData, index) => {
            return index !== id - 1;
          })
          .map((playerData) => transformCharacterData(playerData));
        setOtherPlayers(players);
        console.log("Other players:", players);
      } catch (error) {
        console.error("Something went wrong fetching all players:", error);
      }
    };

    const onAttackComplete = (newBossHp, newPlayerHp) => {
      const bossHp = newBossHp.toNumber();
      const playerHp = newPlayerHp.toNumber();
      console.log(`AttackComplete: Boss Hp: ${bossHp} Player Hp: ${playerHp}`);

      setBoss((prevState) => {
        return { ...prevState, hp: bossHp };
      });
      setCharacterNFT((prevState) => {
        return { ...prevState, hp: playerHp };
      });
      if (bossHp === 0) {
        setWin(true);
      }
    };

    if (gameContract) {
      fetchBoss();
      // getAllPlayers();
      getOtherPlayers();
      gameContract.on("AttackComplete", onAttackComplete);
    }

    return () => {
      if (gameContract) {
        gameContract.off("AttackComplete", onAttackComplete);
      }
    };
  }, [gameContract]);

  useEffect(() => {
    const { ethereum } = window;
    if (ethereum) {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const gameContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        myEpicGame.abi,
        signer
      );
      setGameContract(gameContract);
    } else {
      console.log("Ethereum object not found");
    }
  }, []);

  return (
    <div className="arena-container">
      {/* 攻撃ダメージの通知を追加します */}
      {boss && characterNFT && (
        <div id="toast" className={showToast ? "show" : ""}>
          <div id="desc">{`💥 ${boss.name} was hit for ${characterNFT.attackDamage}!`}</div>
        </div>
      )}
      {/* ボスをレンダリング */}
      {boss && !win && (
        <div className="boss-container">
          <div className={`boss-content ${attackState}`}>
            <h2>🔥 {boss.name} 🔥</h2>
            <div className="image-content">
              <img src={boss.imageURI} alt={`Boss ${boss.name}`} />
              <div className="health-bar">
                <progress value={boss.hp} max={boss.maxHp} />
                <p>{`${boss.hp} / ${boss.maxHp} HP`}</p>
              </div>
            </div>
          </div>
          <div className="attack-container">
            <button className="cta-button" onClick={runAttackAction}>
              {`💥 Attack ${boss.name}`}
            </button>
          </div>
          {/* Attackボタンの下のローディングマーク */}
          {attackState === "attacking" && (
            <div className="loading-indicator">
              <LoadingIndicator />
              <p>Attacking ⚔️</p>
            </div>
          )}
        </div>
      )}
      {/* ボスに勝った場合 */}
      {boss && win && (
        <div className="win">
          <h2>🎉🎉🎉 YOU WIN 🎉🎉🎉</h2>
        </div>
      )}
      {/* NFTキャラクターをレンダリング*/}
      {characterNFT /*&& allPlayers*/ && otherPlayers && (
        <div className="players-container">
          <div className="player-container">
            <h2>Your Character</h2>
            <div className="player">
              <div className="image-content">
                <h2>{characterNFT.name}</h2>
                <img
                  src={`https://cloudflare-ipfs.com/ipfs/${characterNFT.imageURI}`}
                  alt={`Character ${characterNFT.name}`}
                />
                <div className="health-bar">
                  <progress value={characterNFT.hp} max={characterNFT.maxHp} />
                  <p>{`${characterNFT.hp} / ${characterNFT.maxHp} HP`}</p>
                </div>
              </div>
              <div className="stats">
                <h4>{`⚔️ Attack Damage: ${characterNFT.attackDamage}`}</h4>
              </div>
            </div>
          </div>
          <div className="player-container">
            <h2>Other Players</h2>
            <div className="all-players">{renderActivePlayersList()}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Arena;
