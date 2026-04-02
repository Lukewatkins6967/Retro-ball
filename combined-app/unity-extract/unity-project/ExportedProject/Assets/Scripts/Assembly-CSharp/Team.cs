using System;
using System.Collections.Generic;
using UnityEngine;

public class Team : MonoBehaviour
{
	[Serializable]
	public class TeamPlayerAnims
	{
		public AnimationClip m_dead;

		public AnimationClip m_fall;

		public AnimationClip m_hit;

		public AnimationClip m_idle;

		public AnimationClip m_jump;

		public AnimationClip m_kick;

		public AnimationClip m_punch;

		public AnimationClip m_run;

		public AnimationClip m_dodge;
	}

	[Serializable]
	public class TeamPlayer
	{
		public string m_displayName;

		public TeamPlayerAnims m_playerAnims;
	}

	[SerializeField]
	private string m_displayName = string.Empty;

	[SerializeField]
	private GameObject m_playerPrefab;

	[SerializeField]
	private Color m_playerColor = Color.white;

	[SerializeField]
	private Color m_lightColor = Color.white;

	[SerializeField]
	private List<TeamPlayer> m_teamPlayers;

	private Hoop m_attackHoop;

	private Hoop m_defendHoop;

	private Transform[] m_playerSpawns;

	private Transform[] m_attackPositions;

	private Transform[] m_shootPositions;

	private List<Player> m_players = new List<Player>();

	private int m_score;

	public string GetDisplayName()
	{
		return m_displayName;
	}

	public GameObject GetPlayerPrefab()
	{
		return m_playerPrefab;
	}

	public Color GetColor()
	{
		return m_playerColor;
	}

	public Color GetColorLight()
	{
		return m_lightColor;
	}

	public List<TeamPlayer> GetTeamPlayers()
	{
		return m_teamPlayers;
	}

	public int GetScore()
	{
		return m_score;
	}

	public void SetScore(int score)
	{
		m_score = score;
	}

	public void SetAttackHoop(Hoop hoop)
	{
		m_attackHoop = hoop;
	}

	public Hoop GetAttackHoop()
	{
		return m_attackHoop;
	}

	public float GetAttackDirection()
	{
		return Mathf.Sign(GetAttackHoop().GetBackboard().transform.position.x);
	}

	public float GetDefendDirection()
	{
		return Mathf.Sign(GetDefendHoop().GetBackboard().transform.position.x);
	}

	public void SetDefendHoop(Hoop hoop)
	{
		m_defendHoop = hoop;
	}

	public Hoop GetDefendHoop()
	{
		return m_defendHoop;
	}

	public void SetPlayerSpawns(Transform[] playerSpawns)
	{
		m_playerSpawns = playerSpawns;
	}

	public Transform[] GetPlayerSpawns()
	{
		return m_playerSpawns;
	}

	public void SetAttackPositions(Transform[] positions)
	{
		m_attackPositions = positions;
	}

	public Transform[] GetAttackPositions()
	{
		return m_attackPositions;
	}

	public void SetShootPositions(Transform[] positions)
	{
		m_shootPositions = positions;
	}

	public Transform[] GetShootPositions()
	{
		return m_shootPositions;
	}

	public void AssignPlayer(Player player)
	{
		m_players.Add(player);
	}

	public List<Player> GetPlayers()
	{
		return m_players;
	}

	public List<Player> GetAlivePlayers()
	{
		return m_players.FindAll((Player x) => x.GetAlive());
	}

	public bool HasAIPlayer()
	{
		return m_players.Exists((Player item) => item.GetIsAI());
	}
}
