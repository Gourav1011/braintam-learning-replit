[1mdiff --git a/artifacts/braintam/src/pages/dashboard.tsx b/artifacts/braintam/src/pages/dashboard.tsx[m
[1mindex cd8d4d1..99160a9 100644[m
[1m--- a/artifacts/braintam/src/pages/dashboard.tsx[m
[1m+++ b/artifacts/braintam/src/pages/dashboard.tsx[m
[36m@@ -877,125 +877,80 @@[m [mexport default function DashboardPage() {[m
         {(leaderboard?.length ?? 0) > 0 && ([m
           <div>[m
             <div className="flex items-center justify-between mb-3">[m
[31m-              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Top Learners This Week</h2>[m
[32m+[m[32m              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">[m
[32m+[m[32m                Top Learners This Week[m
[32m+[m[32m              </h2>[m
[32m+[m
               <Link href="/leaderboard">[m
[31m-                <span className="text-xs font-semibold flex items-center gap-1" style={{ color: NAVY2 }}>[m
[32m+[m[32m                <span[m
[32m+[m[32m                  className="text-xs font-semibold flex items-center gap-1 cursor-pointer"[m
[32m+[m[32m                  style={{ color: NAVY2 }}[m
[32m+[m[32m                >[m
                   View All <ChevronRight className="w-3 h-3" />[m
                 </span>[m
               </Link>[m
             </div>[m
 [m
[31m-            {/* Top 3 podium */}[m
[31m-            <div[m
[31m-              className="rounded-2xl p-4 mb-3"[m
[31m-              style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY2} 100%)` }}[m
[31m-            >[m
[31m-              <div className="flex items-end justify-center gap-3">[m
[31m-                {/* 2nd */}[m
[31m-                {leaderboard && leaderboard[1] && ([m
[31m-                  <div className="flex flex-col items-center gap-1">[m
[31m-                    <Avatar className="w-10 h-10 shadow">[m
[31m-                      {leaderboard[1].avatarUrl ? ([m
[31m-                        <img[m
[31m-                          src={leaderboard[1].avatarUrl}[m
[31m-                          alt={leaderboard[1].studentName}[m
[31m-                          className="w-full h-full object-cover"[m
[31m-                        />[m
[31m-                      ) : ([m
[31m-                        <AvatarFallback className="bg-slate-300 text-lg font-bold text-white">[m
[31m-                          {leaderboard[1].studentName.charAt(0)}[m
[31m-                        </AvatarFallback>[m
[31m-                      )}[m
[31m-                    </Avatar>[m
[31m-                    <div className="text-white text-[10px] font-semibold truncate w-16 text-center">{leaderboard[1].studentName.split(" ")[0]}</div>[m
[31m-                    <div className="text-white/60 text-[9px]">{leaderboard[1].points} pts</div>[m
[31m-                    <div className="w-12 h-10 rounded-t-xl flex items-center justify-center text-base font-bold" style={{ background: "rgba(255,255,255,0.1)", color: "#94a3b8" }}>🥈</div>[m
[31m-                  </div>[m
[31m-                )}[m
[31m-                {/* 1st */}[m
[31m-                {leaderboard && leaderboard[0] && ([m
[31m-                  <div className="flex flex-col items-center gap-1 -mb-1">[m
[31m-                    <Avatar className="w-12 h-12 shadow-lg">[m
[31m-                      {leaderboard[0].avatarUrl ? ([m
[31m-                        <img[m
[31m-                          src={leaderboard[0].avatarUrl}[m
[31m-                          alt={leaderboard[0].studentName}[m
[31m-                          className="w-full h-full object-cover"[m
[31m-                        />[m
[31m-                      ) : ([m
[31m-                        <AvatarFallback[m
[31m-                          className="text-xl font-bold"[m
[31m-                          style={{ background: GOLD, color: NAVY }}[m
[31m-                        >[m
[31m-                          {leaderboard[0].studentName.charAt(0)}[m
[31m-                        </AvatarFallback>[m
[31m-                      )}[m
[31m-                    </Avatar>[m
[31m-                    <div className="text-white text-xs font-bold truncate w-20 text-center">{leaderboard[0].studentName.split(" ")[0]}</div>[m
[31m-                    <div className="text-[10px]" style={{ color: GOLD }}>{leaderboard[0].points} pts</div>[m
[31m-                    <div className="w-14 h-14 rounded-t-xl flex items-center justify-center text-xl font-bold" style={{ background: "rgba(255,255,255,0.15)" }}>🥇</div>[m
[31m-                  </div>[m
[31m-                )}[m
[31m-                {/* 3rd */}[m
[31m-                {leaderboard && leaderboard[2] && ([m
[31m-                  <div className="flex flex-col items-center gap-1">[m
[31m-                    <Avatar className="w-10 h-10 shadow">[m
[31m-                      {leaderboard[2].avatarUrl ? ([m
[32m+[m[32m            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">[m
[32m+[m[32m              {(leaderboard ?? []).slice(0, 5).map((entry, index) => ([m
[32m+[m[32m                <Link key={entry.rank} href="/leaderboard">[m
[32m+[m[32m                  <div[m
[32m+[m[32m                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${[m
[32m+[m[32m                      index !== Math.min((leaderboard?.length ?? 0), 5) - 1[m
[32m+[m[32m                        ? "border-b border-gray-100"[m
[32m+[m[32m                        : ""[m
[32m+[m[32m                    }`}[m
[32m+[m[32m                    data-testid={`leaderboard-entry-${entry.rank}`}[m
[32m+[m[32m                  >[m
[32m+[m[32m                    <div[m
[32m+[m[32m                      className="w-7 flex-shrink-0 text-center text-sm font-bold"[m
[32m+[m[32m                      style={{ color: entry.rank <= 3 ? NAVY2 : "#94a3b8" }}[m
[32m+[m[32m                    >[m
[32m+[m[32m                      {entry.rank}[m
[32m+[m[32m                    </div>[m
[32m+[m
[32m+[m[32m                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-slate-100">[m
[32m+[m[32m                      {entry.avatarUrl ? ([m
                         <img[m
[31m-                          src={leaderboard[2].avatarUrl}[m
[31m-                          alt={leaderboard[2].studentName}[m
[32m+[m[32m                          src={entry.avatarUrl}[m
[32m+[m[32m                          alt={entry.studentName}[m
                           className="w-full h-full object-cover"[m
                         />[m
                       ) : ([m
[31m-                        <AvatarFallback[m
[31m-                          className="text-lg font-bold text-white"[m
[31m-                          style={{ background: "#b45309" }}[m
[32m+[m[32m                        <div[m
[32m+[m[32m                          className="w-full h-full flex items-center justify-center text-white text-sm font-bold"[m
[32m+[m[32m                          style={{[m
[32m+[m[32m                            background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`,[m
[32m+[m[32m                          }}[m
                         >[m
[31m-                          {leaderboard[2].studentName.charAt(0)}[m
[31m-                        </AvatarFallback>[m
[32m+[m[32m                          {entry.studentName?.charAt(0)?.toUpperCase() || "S"}[m
[32m+[m[32m                        </div>[m
                       )}[m
[31m-                    </Avatar>[m
[31m-                    <div className="text-white text-[10px] font-semibold truncate w-16 text-center">{leaderboard[2].studentName.split(" ")[0]}</div>[m
[31m-                    <div className="text-white/60 text-[9px]">{leaderboard[2].points} pts</div>[m
[31m-                    <div className="w-12 h-8 rounded-t-xl flex items-center justify-center text-base font-bold" style={{ background: "rgba(255,255,255,0.1)", color: "#b45309" }}>🥉</div>[m
[31m-                  </div>[m
[31m-                )}[m
[31m-              </div>[m
[31m-            </div>[m
[32m+[m[32m                    </div>[m
 [m
[31m-            {/* Ranks 4-5 */}[m
[31m-            <div className="space-y-2">[m
[31m-              {(leaderboard ?? []).slice(3, 5).map((entry, i) => ([m
[31m-                <motion.div[m
[31m-                  key={entry.rank}[m
[31m-                  initial={{ opacity: 0 }}[m
[31m-                  animate={{ opacity: 1 }}[m
[31m-                  transition={{ delay: 0.1 * i }}[m
[31m-                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl"[m
[31m-                  style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}[m
[31m-                  data-testid={`leaderboard-entry-${entry.rank}`}[m
[31m-                >[m
[31m-                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">[m
[31m-                    {entry.rank}[m
[31m-                  </div>[m
[31m-                  <Avatar className="w-8 h-8 flex-shrink-0">[m
[31m-                    {entry.avatarUrl ? ([m
[31m-                      <img[m
[31m-                        src={entry.avatarUrl}[m
[31m-                        alt={entry.studentName}[m
[31m-                        className="w-full h-full object-cover"[m
[31m-                      />[m
[31m-                    ) : ([m
[31m-                      <AvatarFallback className="bg-slate-100 text-xs font-bold text-slate-600">[m
[31m-                        {entry.studentName.charAt(0).toUpperCase()}[m
[31m-                      </AvatarFallback>[m
[31m-                    )}[m
[31m-                  </Avatar>[m
[31m-                  <div className="flex-1 min-w-0">[m
[31m-                    <div className="text-sm font-semibold truncate">{entry.studentName}</div>[m
[32m+[m[32m                    <div className="flex-1 min-w-0">[m
[32m+[m[32m                      <div className="text-sm font-semibold text-gray-800 truncate">[m
[32m+[m[32m                        {entry.studentName}[m
[32m+[m[32m                      </div>[m
[32m+[m
[32m+[m[32m                      <div className="text-[11px] text-gray-400">[m
[32m+[m[32m                        Grade {entry.grade}[m
[32m+[m[32m                      </div>[m
[32m+[m[32m                    </div>[m
[32m+[m
[32m+[m[32m                    <div className="text-right flex-shrink-0">[m
[32m+[m[32m                      <div[m
[32m+[m[32m                        className="text-sm font-bold"[m
[32m+[m[32m                        style={{ color: NAVY2 }}[m
[32m+[m[32m                      >[m
[32m+[m[32m                        {entry.points}[m
[32m+[m[32m                      </div>[m
[32m+[m[32m                      <div className="text-[10px] text-gray-400">[m
[32m+[m[32m                        points[m
[32m+[m[32m                      </div>[m
[32m+[m[32m                    </div>[m
                   </div>[m
[31m-                  <div className="text-xs font-bold" style={{ color: NAVY2 }}>{entry.points} pts</div>[m
[31m-                </motion.div>[m
[32m+[m[32m                </Link>[m
               ))}[m
             </div>[m
           </div>[m
